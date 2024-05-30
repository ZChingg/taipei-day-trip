from fastapi import *
from fastapi.responses import FileResponse, JSONResponse
import mysql.connector
app=FastAPI() #uvicorn app:app --reload

con = mysql.connector.connect(
    user = "root",
    password = "0000",
    host = "localhost",
    database = "trip"
)
print("資料庫連線成功")

@app.get("/api/attractions")
async def 取得景點資料列表(request: Request,
					 page: int = Query(0, ge=0), # ge=0 為 grater than or equal to 0
					 keyword: str = Query(None)):
	try:
		con.reconnect()
		cursor = con.cursor(dictionary=True) # 預設回傳資料為tuple[(1,平安鐘)]，轉成用包含字典的列表[{'id':1,'name':平安鐘}]
		offset = page*12 # 要從第幾條開始讀資料 page=1, offset=12 (從第12條開始讀資料)
		if keyword:
			sql =  "SELECT tripdata.id, name, category, description, address, transport, mrt, lat, lng, GROUP_CONCAT(images) AS images FROM tripdata INNER JOIN images ON tripdata.id = images.trip_id WHERE mrt = %s OR name LIKE %s GROUP BY trip_id" # 捷運完全比對;景點名模糊比對
			cursor.execute(sql, (keyword, "%"+keyword+"%"))
		else:
			sql = "SELECT tripdata.id, name, category, description, address, transport, mrt, lat, lng, GROUP_CONCAT(images) AS images FROM tripdata INNER JOIN images ON tripdata.id = images.trip_id GROUP BY trip_id"
			cursor.execute(sql)
		result = cursor.fetchall()
		
		# 獲取 nextPage 數值
		if len(result) > offset+12: # 若資料長度>當前頁面可容納的資料數
			next_page = page+1
		else:
			next_page = None
		# 取得分頁，每頁 12 筆資料
		data = result[offset:offset+12] #切片(slicing)
		# 將 images 字串拆分為列表
		for url in result:
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
		sql =  "SELECT tripdata.id, name, category, description, address, transport, mrt, lat, lng, GROUP_CONCAT(images) AS images FROM tripdata INNER JOIN images ON tripdata.id = images.trip_id WHERE tripdata.id = %s GROUP BY trip_id"
		cursor.execute(sql, (attractionId,))
		data = cursor.fetchone()
		if data:
			data["images"] = data["images"].split(",")
			return JSONResponse({
			"data": data
		})
		else:
			return JSONResponse(
				{"error": True, "message": "請按照情境提供對應的錯誤訊息"},
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