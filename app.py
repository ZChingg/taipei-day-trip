from fastapi import *
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from dotenv import load_dotenv
import os
import mysql.connector.pooling
import jwt
import time, datetime
import requests
import bcrypt

app=FastAPI() #uvicorn app:app --reload
app.mount("/static", StaticFiles(directory="static"), name="static")

# 使用 .env
load_dotenv() # take environment variables from .env.
mysql_user = os.getenv("MYSQL_USER")
mysql_password = os.getenv("MYSQL_PASSWORD")
mysql_host = os.getenv("MYSQL_HOST")
mysql_db = os.getenv("MYSQL_DB")
jwt_secret_key = os.getenv("JWT_SECRET_KEY")
tappay_partner_key  = os.getenv("TAPPAY_PARTNER_KEY")

# 使用 connection pool 連接 mysql 資料庫
dbconfig = {
	"user": mysql_user,
    "password": mysql_password,
    "host": mysql_host,
    "database": mysql_db
}
pool = mysql.connector.pooling.MySQLConnectionPool(pool_name = "mypool",
												   pool_size = 15,
												   **dbconfig)

@app.get("/api/attractions")
async def 取得景點資料列表(request: Request,
					 page: int = Query(0, ge=0), # ge=0 為 greater than or equal to 0
					 keyword: str = Query(None)):
	try:
		con = pool.get_connection()
		cursor = con.cursor(dictionary=True) # 預設回傳資料為tuple[(1,平安鐘)]，轉成用包含字典的列表[{'id':1,'name':平安鐘}]
		if keyword:
			sql = """SELECT tripdata.id, name, category, description, address, transport, mrt, lat, lng, GROUP_CONCAT(images) AS images FROM tripdata 
			INNER JOIN images ON tripdata.id = images.trip_id 
			WHERE mrt = %s OR name LIKE %s  
			GROUP BY trip_id 
			LIMIT %s, 12""" # 捷運完全比對;景點名模糊比對
			cursor.execute(sql, (keyword, f"%{keyword}%", page*12))
		else:
			sql2 = """SELECT tripdata.id, name, category, description, address, transport, mrt, lat, lng, GROUP_CONCAT(images) AS images FROM tripdata 
			INNER JOIN images ON tripdata.id = images.trip_id 
			GROUP BY trip_id 
			LIMIT %s, 12"""
			cursor.execute(sql2, (page*12,))
		data = cursor.fetchall()
		
		# 獲取 nextPage 數值
		if len(data) == 12:
			if keyword:
				cursor.execute(sql, (keyword, f"%{keyword}%", page*12+12))
				more_data = cursor.fetchall()
				if more_data:
					next_page = page+1
			else:
				cursor.execute(sql2, (page*12+12,))
				more_data = cursor.fetchall()
				if more_data:
					next_page = page+1
		else:
			next_page = None
		# 將 images 字串拆分為列表
		for url in data:
			url["images"] = url["images"].split(",")

		return JSONResponse({
			"nextPage": next_page,
			"data": data
		})
	except Exception as e: # 例外處理，Exception: 通用的異常類型(不知錯誤型別)
		return JSONResponse({
		"error": True, "message": f"{e}"},
		status_code=500)
	finally:
		con.close()

@app.get("/api/attraction/{attractionId}")
async def 根據景點編號取得景點資料(request: Request,
					 attractionId: int):
	try:
		con = pool.get_connection()
		cursor = con.cursor(dictionary=True) # 預設回傳資料為tuple[(1,平安鐘)]，轉成用包含字典的列表[{'id':1,'name':平安鐘}]
		sql =  """SELECT tripdata.id, name, category, description, address, transport, mrt, lat, lng, GROUP_CONCAT(images) AS images FROM tripdata 
		INNER JOIN images ON tripdata.id = images.trip_id 
		WHERE tripdata.id = %s GROUP BY trip_id"""
		cursor.execute(sql, (attractionId,))
		data = cursor.fetchone()
		if data:
			data["images"] = data["images"].split(",")
			return JSONResponse({
			"data": data
		})
		else:
			return JSONResponse(
				{"error": True, "message": "景點編號不正確"},
				status_code=400)
	except Exception as e: 
		return JSONResponse({
		"error": True, "message": f"{e}"},
		status_code=500)
	finally:
		con.close()

@app.get("/api/mrts")
async def 取得捷運站名稱列表(request: Request):
	try:
		con = pool.get_connection()
		cursor = con.cursor(dictionary=True)
		sql = "SELECT mrt FROM tripdata GROUP BY mrt ORDER BY COUNT(mrt) DESC"
		cursor.execute(sql)
		data = cursor.fetchall()
		mrt_list = []
		for mrt in data: 
			if mrt["mrt"] != None:
				mrt_list.append(mrt["mrt"])
		return JSONResponse({
			"data": mrt_list
		})
	except Exception as e:
		return JSONResponse({
		"error": True, "message": f"{e}"},
		status_code=500)
	finally:
		con.close()


class SignUp(BaseModel):
	name: str 
	email: str
	password: str

class SignIn(BaseModel):
	email: str
	password: str

class Booking(BaseModel):
	attractionId: int
	date: str
	time: str
	price: int

# 下訂單
class Attraction(BaseModel):
    id: int
    name: str
    address: str
    image: str

class Trip(BaseModel):
    attraction: Attraction
    date: str
    time: str

class Contact(BaseModel):
    name: str
    email: str
    phone: str

class Order(BaseModel):
    price: int
    trip: Trip
    contact: Contact

class PaymentRequest(BaseModel):
    prime: str
    order: Order

# 密碼以 bcrypt 加密
def hash_password(password):
	salt = bcrypt.gensalt()
	hash_password = bcrypt.hashpw(password.encode("utf-8"), salt)
	return hash_password.decode("utf-8")

# HTTP Bearer token authentication (JWT驗證)
security = HTTPBearer()

def jwt_bearer(credentials: HTTPAuthorizationCredentials = Depends(security)): # credentials 是 HTTPAuthorizationCredentials 類型（包含著 scheme、credentials），且依賴於 security
	try:
		token = credentials.credentials # 會從請求 header 獲取 token，若是 credentials.scheme 就是獲取 "Bearer"
		payload = jwt.decode(token, jwt_secret_key, algorithms=["HS256"])
		return payload # token 驗證成功
	except Exception:
		return None # token 驗證失敗
	
@app.post("/api/user")
async def 註冊一個新的會員(request: Request,
				   data: SignUp = None):
	try:
		signup_dict = data.model_dump() # 將資料轉換為字典格式
		name = signup_dict["name"] # 取值
		email = signup_dict["email"]
		password = signup_dict["password"]
		con = pool.get_connection()
		cursor = con.cursor(dictionary=True)
		cursor.execute("SELECT email FROM member WHERE email = %s", (email,))
		data = cursor.fetchone()
		if data:
			return JSONResponse(
				{"error": True, "message": "註冊失敗，重複的 Email 或其他原因"},
				status_code=400)
		else:
			hashed_password = hash_password(password)
			cursor.execute("INSERT INTO member(name, email, password) VALUES(%s, %s, %s)", (name, email, hashed_password))
			con = pool.get_connection()
			return JSONResponse(
				{"ok": True})
	except Exception as e:
		return JSONResponse(
			{"error": True, "message": f"{e}"},
			status_code=500)
	finally:
		con.close()

@app.get("/api/user/auth")
async def 取得當前登入的會員資訊(payload: dict = Depends(jwt_bearer)): # payload 是字典類型，且值由 Depends(jwt_bearer) 提供
	if payload:
		return JSONResponse({"data": payload["data"]})

@app.put("/api/user/auth")
async def 登入會員帳戶(request: Request,
				 data: SignIn = None): 
	try:
		signin_dict = data.model_dump() 
		email = signin_dict["email"]
		password = signin_dict["password"]
		con = pool.get_connection()
		cursor = con.cursor()
		cursor.execute("SELECT * FROM member WHERE email = %s", (email, ))
		data = cursor.fetchone()
		hash_password = data[3]
		if data and bcrypt.checkpw(password.encode("utf-8"), hash_password.encode("utf-8")):
			id, name, email, _ = data
			payload = {
				"exp": (datetime.datetime.now()+datetime.timedelta(days=1)).timestamp(), # 現在時間+一天後轉為時間戳
				"data": {
					"id": id, 
					"name": name, 
					"email": email
					}
			}
			token = jwt.encode(payload, jwt_secret_key, algorithm = "HS256")
			return JSONResponse(
				{"token": token}) 
		else:
			return JSONResponse(
				{"error": True, "message": "登入失敗，帳號或密碼錯誤或其他原因"},
				status_code=400)
	except Exception as e: 
		return JSONResponse({
		"error": True, "message": f"{e}"},
		status_code=500)
	finally:
		con.close()
	
@app.get("/api/booking")
async def 取得尚未確認下單的預定行程(payload: dict = Depends(jwt_bearer)):
	if payload != None:
		member_id =  payload["data"]["id"]
		con = pool.get_connection()
		try:
			cursor = con.cursor()
			cursor.execute( # 透過 token 得到使用者 id 後取其預定資料
				"""SELECT attraction_id, date, time, price FROM cart 
				WHERE member_id = %s 
				ORDER BY id DESC 
				LIMIT 1""", 
				(member_id,)
				)
			data = cursor.fetchone()
			if data:
				attraction_id, date, time, price = data
				cursor.execute( # 根據景點編號取對應景點資料
					"""SELECT name, address, images 
					FROM tripdata INNER JOIN images ON tripdata.id = images.trip_id 
					WHERE tripdata.id = %s
					LIMIT 1""",
					(attraction_id,)
					)
				data = cursor.fetchone()
				name, address, images = data
				return JSONResponse({
						"data": {
							"attraction": {
								"id": attraction_id,
								"name": name,
								"address": address,
								"image": images
							},
							"date": date,
							"time": time,
							"price": price
						}
						})
		finally:
			con.close()
	else:
		return JSONResponse(
			{"error": True, "message": "未登入系統，拒絕存取"},
			status_code=403)

@app.post("/api/booking")
async def 建立新的預定行程(
	payload: dict = Depends(jwt_bearer),
	data: Booking = None
	):
	try:
		if payload != None:
			member_id = payload["data"]["id"]
			try:
				booking_dict = data.model_dump()
				attraction_id = booking_dict["attractionId"]
				date = booking_dict["date"]
				time = booking_dict["time"]
				price = booking_dict["price"]
				con = pool.get_connection()
				cursor=con.cursor()
				cursor.execute( # 儲存預定資料至資料庫
					"INSERT INTO cart(member_id, attraction_id, date, time, price) VALUES(%s, %s, %s, %s, %s)",
					(member_id, attraction_id, date, time, price)
					)
				con.commit()
				return JSONResponse({"ok": True})
			except Exception:
				return JSONResponse(
					{"error": True, "message": "建立失敗，輸入不正確或其他原因"},
					status_code=400)
		else:
			return JSONResponse(
				{"error": True, "message": "未登入系統，拒絕存取"},
				status_code=403)
	except Exception as e:
		return JSONResponse(
			{"error": True, "message": f"{e}"},
			status_code=500)
	finally:
		con.close()

@app.delete("/api/booking")
async def 刪除目前的預定行程(payload: dict = Depends(jwt_bearer)):
	if payload != None:
		member_id =  payload["data"]["id"]
		con = pool.get_connection()
		cursor = con.cursor()
		cursor.execute("DELETE FROM cart WHERE member_id = %s", (member_id,))
		con.commit()
		con.close()
		return JSONResponse({"ok": True})
	else:
		return JSONResponse(
			{"error": True, "message": "未登入系統，拒絕存取"},
			status_code=403)

# 為每筆訂單建立唯一的訂單編號
def get_order_number(member_id):
	# 訂單編號 = YYMMDDHHMMSS + 時間戳後6位 + member id
	order_number = datetime.datetime.now().strftime("%Y%m%d%H%M%S") + str(time.time()).replace('.', '')[-6:] + str(member_id)
	return order_number

# 將付款資料存入資料庫
def insert_payment_data(cursor, order_id, result):
    sql = """INSERT INTO payment
    (orders_id, status, msg, amount, acquirer, currency, rec_trade_id, bank_transaction_id, 
    order_number, auth_code, card_issuer, card_funding, card_type, card_level, card_country, 
    card_last_four, card_bin_code, card_bank_id, card_country_code, transaction_time,
    bank_transaction_start_time, bank_transaction_end_time, bank_result_code, bank_result_msg, card_identifier, 
    merchant_id, is_rba_verified, transaction_method, transaction_method_reference)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"""
    cursor.execute(sql, (
		order_id,
        result["status"],
        result["msg"],
        result["amount"],
        result["acquirer"],
        result["currency"],
        result["rec_trade_id"],
        result["bank_transaction_id"],
        result["order_number"],
        result["auth_code"],
        result["card_info"]["issuer"], 
        result["card_info"]["funding"], 
        result["card_info"]["type"],
        result["card_info"]["level"], 
        result["card_info"]["country"], 
        result["card_info"]["last_four"],
        result["card_info"]["bin_code"], 
        result["card_info"]["bank_id"], 
        result["card_info"]["country_code"],
        result["transaction_time_millis"],
        result["bank_transaction_time"]["start_time_millis"], 
        result["bank_transaction_time"]["end_time_millis"],
        result["bank_result_code"],
        result["bank_result_msg"],
        result["card_identifier"],
        result["merchant_id"],
        result["is_rba_verified"],
        result["transaction_method_details"]["transaction_method"], 
        result["transaction_method_details"]["transaction_method_reference"]
    ))

@app.post("/api/orders")
async def 建立新的訂單並完成付款程序(
	payload: dict = Depends(jwt_bearer),
	data: PaymentRequest = None):
	try:
		if payload != None:
			member_id = payload["data"]["id"]
			try:
				# 儲存訂單資料至資料庫
				orders_dict = data.model_dump()
				attraction_id = orders_dict["order"]["trip"]["attraction"]["id"]
				date = orders_dict["order"]["trip"]["date"]
				time = orders_dict["order"]["trip"]["time"]
				price = orders_dict["order"]["price"]
				name = orders_dict["order"]["contact"]["name"]
				email = orders_dict["order"]["contact"]["email"]
				phone = orders_dict["order"]["contact"]["phone"]
				payment = "UNPAID"
				con = pool.get_connection()
				cursor=con.cursor()
				cursor.execute(
					"""INSERT INTO orders(member_id, attraction_id, date, time, price, name, email, phone, payment) 
					VALUES(%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
					(member_id, attraction_id, date, time, price, name, email, phone, payment)
					)
				con.commit()
				# 取得剛新增(最後一行插入)的訂單的 ID
				order_id = cursor.lastrowid 
				# 取得唯一的訂單編號
				order_number = get_order_number(member_id)

				# 發送 POST 請求至 TapPay Pay By Prime API
				tappay_headers = {
					"Content-Type": "application/json",
                    "x-api-key": tappay_partner_key
					}
				tappay_json = {
					"prime": data.prime,
					"partner_key": tappay_partner_key,
					"merchant_id": "ZChingg_CTBC",
					"details": "台北市區一日遊",
					"amount": price,
					"order_number": order_number,
					"cardholder": {
						"phone_number": phone,
						"name": name,
						"email": email
						},
					"remember": False
					}
				# requests 套件發送請求後，會收到回傳的 Response 物件
				tappay_response = requests.post(
					"https://sandbox.tappaysdk.com/tpc/payment/pay-by-prime", 
					headers=tappay_headers, 
					json=tappay_json
					)
				# 取得 Pay By Prime API json 資料
				result = tappay_response.json() 
				# 若成功付款
				if result['status'] == 0:
					# 更新 orders 資料表付款狀態
					cursor.execute("UPDATE orders SET payment = 'PAID' WHERE id = %s", (order_id,))
					# 新增付款資訊至 payment 資料表
					insert_payment_data(cursor, order_id, result)
					con.commit()
					return JSONResponse(
						{
							"data": {
								"number": order_number,
								"payment": {
									"status": result["status"],
									"message": "付款成功"
								}
							}
						})
				# 若失敗
				else:	
					# 新增付款資訊至 payment 資料表
					insert_payment_data(cursor, order_id, result)
					return JSONResponse(
						{
							"data": {
								"number": order_number,
								"payment": {
									"status": result["status"],
									"message": "付款失敗"
								}
							}
						})
			except Exception as e:
				return JSONResponse(
					{"error": True, "message": f"{e}"},
					status_code=400)
		else:
			return JSONResponse(
				{"error": True, "message": "未登入系統，拒絕存取"},
				status_code=403)
	except Exception as e:
		return JSONResponse(
			{"error": True, "message": f"{e}"},
			status_code=500)
	finally:
		con.close()


# Static Pages (Never Modify Code in this Block)
@app.get("/", include_in_schema=False)
async def index(request: Request):
	return FileResponse("./static/index.html", media_type="text/html")
@app.get("/attraction/{id}", include_in_schema=False)
async def attraction(request: Request, id: int):
	return FileResponse("./static/attraction.html", media_type="text/html")
@app.get("/booking", include_in_schema=False)
async def booking(request: Request):
	return FileResponse("./static/booking.html", media_type="text/html")
@app.get("/thankyou", include_in_schema=False)
async def thankyou(request: Request):
	return FileResponse("./static/thankyou.html", media_type="text/html")