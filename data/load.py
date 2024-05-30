import json
import mysql.connector

con = mysql.connector.connect(
    user = "root",
    password = "a32128466",
    host = "localhost",
    database = "trip"
)
print("資料庫連線成功")

# 拆解 JSON 檔案
jsonFile = open('/Users/zhaoziqing/Desktop/taipei-day-trip/data/taipei-attractions.json', 'r')
a = json.load(jsonFile)
data = a["result"]["results"]
# 拆分 url 
for i in data:
    file = i["file"]
    urls = file.split("https://")[1:] # 以split拆分返回新子字符串列表 # 排除列表中第一個元素[0](空白)
    new_urls = []
    for url in urls:
        full_url = "https://"+url
        if full_url.lower().endswith("jpg") or full_url.lower().endswith("png"): # url全改小寫後確認是否以jpg/png結尾(endswith大小寫敏感)
            new_urls.append(full_url)
    # 將資料存入 MySQL tripdata
    cursor = con.cursor()
    cursor.execute("INSERT INTO tripdata(name, category, description, address, transport, mrt, lat, lng) VALUES(%s, %s, %s, %s, %s, %s, %s, %s)", 
                   (i["name"], i["CAT"], i["description"], i["address"], i["direction"], i["MRT"], i["latitude"], i["longitude"]))
    trip_id = cursor.lastrowid # 獲取剛插入的資料的主鍵ID
    # 將 url 存入 MySQL images 並與 tripdata 用外鍵連結
    for ttlurl in new_urls:
            cursor.execute("INSERT INTO images(trip_id, images) VALUES(%s, %s)", (trip_id, ttlurl))
    con.commit()

con.close()