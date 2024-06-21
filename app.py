from fastapi import *
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import mysql.connector
import jwt
import datetime

app=FastAPI() #uvicorn app:app --reload
app.mount("/static", StaticFiles(directory="static"), name="static")

con = mysql.connector.connect(
    user = "root",
    password = "a32128466",
    host = "localhost",
    database = "trip"
)
print("資料庫連線成功")

@app.get("/api/attractions")
async def 取得景點資料列表(request: Request,
					 page: int = Query(0, ge=0), # ge=0 為 greater than or equal to 0
					 keyword: str = Query(None)):
	try:
		con.reconnect()
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

@app.get("/api/attraction/{attractionId}")
async def 根據景點編號取得景點資料(request: Request,
					 attractionId: int):
	try:
		con.reconnect()
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
	except Exception as e: # 例外處理，Exception: 通用的異常類型(不知錯誤型別)
		return JSONResponse({
		"error": True, "message": f"{e}"},
		status_code=500)

@app.get("/api/mrts")
async def 取得捷運站名稱列表(request: Request):
	try:
		con.reconnect()
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


class SignUp(BaseModel):
	name: str 
	email: str
	password: str

class SignIn(BaseModel):
	email: str
	password: str

SECRET_KEY = "BF6B06649E573E1F9049B869DD4F83CCBA8C250E733C9E2F8DAD2081611CAB1C"

@app.post("/api/user")
async def 註冊一個新的會員(request: Request,
				   data: SignUp = None):
	try:
		signup_dict = data.model_dump() # 將資料轉換為字典格式
		name = signup_dict["name"] # 取值
		email = signup_dict["email"]
		password = signup_dict["password"]
		con.reconnect()
		cursor = con.cursor(dictionary=True)
		cursor.execute("SELECT email FROM member WHERE email = %s", (email,))
		data = cursor.fetchone()
		if data:
			return JSONResponse(
				{"error": True, "message": "註冊失敗，重複的 Email 或其他原因"},
				status_code=400)
		else:
			cursor.execute("INSERT INTO member(name, email, password) VALUES(%s, %s, %s)", (name, email, password))
			con.commit()
			return JSONResponse(
				{"ok": True})
	except Exception as e:
		return JSONResponse(
			{"error": True, "message": f"{e}"},
			status_code=500)

# HTTP Bearer token authentication (JWT驗證)
security = HTTPBearer()

def jwt_bearer(credentials: HTTPAuthorizationCredentials = Depends(security)): # credentials 是 HTTPAuthorizationCredentials 類型（包含著 scheme、credentials），且依賴於 security
	try:
		token = credentials.credentials # 會從請求 header 獲取 token，若是 credentials.scheme 就是獲取 "Bearer"
		payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
		return payload
	except jwt.exceptions.DecodeError:
		raise HTTPException(status_code=401, detail="Token expired")
	except jwt.exceptions.InvalidTokenError:
		raise HTTPException(status_code=401, detail="Invalid token")
	except Exception as e:
		raise HTTPException(status_code=500, detail=f"{e}")

@app.get("/api/user/auth")
async def 取得當前登入的會員資訊(payload: dict = Depends(jwt_bearer)): # payload 是字典類型，且值由 Depends(jwt_bearer) 提供
    return JSONResponse({"data": payload["data"]})

@app.put("/api/user/auth")
async def 登入會員帳戶(request: Request,
				 data: SignIn = None): 
	try:
		signin_dict = data.model_dump() # 將資料轉換為字典格式
		email = signin_dict["email"]
		password = signin_dict["password"]
		con.reconnect()
		cursor = con.cursor()
		cursor.execute("SELECT id, name, email FROM member WHERE email = %s and password = %s", (email, password))
		data = cursor.fetchone()
		if data:
			id, name, email = data
			payload = {
				"exp": (datetime.datetime.now()+datetime.timedelta(days=1)).timestamp(), # 現在時間+一天後轉為時間戳
				"data": {
					"id": id, 
					"name": name, 
					"email": email
					}
			}
			token = jwt.encode(payload, SECRET_KEY, algorithm = "HS256")
			return JSONResponse(
				{"token": token}) 
		else:
			return JSONResponse(
				{"error": True, "message": "登入失敗，帳號或密碼錯誤或其他原因"},
				status_code=400)
	except Exception as e: # 例外處理，Exception: 通用的異常類型(不知錯誤型別)
		return JSONResponse({
		"error": True, "message": f"{e}"},
		status_code=500)

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