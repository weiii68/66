from flask import Flask, request, jsonify, render_template
import json
import os
from datetime import datetime, timedelta
from flask_cors import CORS
import requests  # 確保 requests 可用
from flask import Response
app = Flask(__name__)
CORS(app)  # 啟用 CORS 支援

# 設定 LINE API
LINE_ACCESS_TOKEN = "WQnshTcFmLcEq9qnxFQUmz8f2x6GR0J3j0vaRZwJD/8P3ypwA30uO6ONGk4x9KwcBZy36uz4xvVJ5H9HqwhW/98uyJ0sEzPMHThMxrU1rFYR0DYbjdHFdDMKeN/or1kInxYamobbeqqEXVykH2va5wdB04t89/1O/w1cDnyilFU="

# 記錄儲存檔案
DATA_PATH = "data/records.json"

# 確保資料夾和 JSON 檔案存在
if not os.path.exists("data"):
    os.makedirs("data")

if not os.path.exists(DATA_PATH):
    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump({}, f, ensure_ascii=False)

# 讀取資料
def read_data():
    try:
        with open(DATA_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        return {}

# 寫入資料
def write_data(data):
    try:
        with open(DATA_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"寫入資料時發生錯誤: {e}")
        return False

# LINE Webhook API
@app.route("/line-webhook", methods=["POST"])
def line_webhook():
    body = request.get_json()
    if "events" not in body:
        return "OK"

    for event in body["events"]:
        if event["type"] == "message":
            user_id = event["source"]["userId"]
            message = event["message"]["text"].strip()
            print(f"user_id: {user_id}")
            print(f"message: {message}")
            
            # 獲取用戶的名稱
            user_name = get_user_name(user_id)
           
            print(f"user_name: {user_name}")  # 顯示名稱
            
            if message == "打卡":
                response = check_in(user_name)
            elif message == "下班":
                response = clock_out(user_name)
            else:
                response = jsonify({"message": "請輸入「打卡」或「下班」來進行操作"}), 400

            jsonn = response[0].get_json()
            reply_to_line(user_id, jsonn.get("message"))

    return "OK"

def get_user_name(user_id):
    # 調用 LINE API 獲取用戶資料
    url = f"https://api.line.me/v2/bot/profile/{user_id}"
    headers = {
        "Authorization": f"Bearer {LINE_ACCESS_TOKEN}"
    }

    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        user_profile = response.json()
        return user_profile.get("displayName")  # 返回顯示名稱
    else:
        print(f"Error fetching user profile: {response.status_code}")
        return "Unknown User"

def reply_to_line(user_id, response):
    # 準備發送的資料
    url = "https://api.line.me/v2/bot/message/push"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {LINE_ACCESS_TOKEN}"
    }

    message = response

    payload = {
        "to": user_id,
        "messages": [{"type": "text", "text": message}]
    }

    try:
        # 發送 POST 請求
        line_response = requests.post(url, headers=headers, json=payload)
        line_response.raise_for_status()  # 檢查請求是否成功
    except requests.exceptions.RequestException as e:
        print(f"Error sending message to LINE: {e}")

# 開始上班 API
@app.route('/check-in/<username>', methods=['POST'])
def check_in(username):
    try:
        db = read_data()
        current_datetime = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        if username not in db:
            db[username] = {"records": [], "total_worked_minutes": 0, "points": 0}

        # 檢查是否已經有未完成的打卡紀錄
        for record in db[username]["records"]:
            if record["end"] == "未打卡":
                return jsonify({"message": "請先結束當前打卡後再開始新的打卡"}), 400

        # 新增新的打卡紀錄
        db[username]["records"].append({
            "start": current_datetime,
            "end": "未打卡",
            "total_hours": "未計算"
        })

        if not write_data(db):
            return jsonify({"message": "儲存資料時發生錯誤"}), 500

        return jsonify({"message": f"{username} 開始上班成功，時間：{current_datetime}"}), 200

    except Exception as e:
        return jsonify({"message": f"發生錯誤: {str(e)}"}), 500

# 結束上班 API
@app.route('/clock-out/<username>', methods=['POST'])
def clock_out(username):
    try:
        db = read_data()
        if username not in db or not db[username]["records"]:
            return jsonify({"message": "沒有找到打卡紀錄"}), 400

        user_records = db[username]["records"]
        last_record = None

        # 找到最近一次未打卡結束的紀錄
        for record in reversed(user_records):
            if record["end"] == "未打卡":
                last_record = record
                break

        if not last_record:
            return jsonify({"message": "沒有找到未結束的打卡紀錄"}), 400

        # 記錄下班時間
        end_time = datetime.now()
        last_record["end"] = end_time.strftime("%Y-%m-%d %H:%M:%S")

        # 計算工時，處理跨日情況
        start_time = datetime.strptime(last_record["start"], "%Y-%m-%d %H:%M:%S")
        total_seconds = (end_time - start_time).total_seconds()

        # 轉換為小時與分鐘
        total_hours = total_seconds // 3600
        total_minutes = (total_seconds % 3600) // 60
        total_minutes_all = total_seconds // 60

        last_record["total_hours"] = f"{int(total_hours)} 小時 {int(total_minutes)} 分鐘"

        # 更新使用者的累積工時
        db[username]["total_worked_minutes"] += total_minutes_all

        # ✅ **這裡修正：只增加新的工時，不重新計算積分**
        if "redeemed_points" not in db[username]:
            db[username]["redeemed_points"] = 0

        # **原始積分計算方式**
        total_points = db[username]["total_worked_minutes"] // 240

        # ✅ **確保積分不會變成負數**
        db[username]["points"] = max(total_points - db[username]["redeemed_points"], 0)

        # ✅ **計算距離下一個積分還差多少分鐘**
        minutes_to_next_point = 240 - (db[username]["total_worked_minutes"] % 240)

        if not write_data(db):
            return jsonify({"message": "儲存資料時發生錯誤"}), 500

        return jsonify({
            "message": f"{username} 下班成功，時間：{last_record['end']}，總工時：{last_record['total_hours']}，\n"
                       f"累積工時：{db[username]['total_worked_minutes']} 分鐘（{db[username]['total_worked_minutes'] / 60:.2f} 小時）\n"
                       f"目前積分：{db[username]['points']}，\n"
                       f"距離下一個積分還差 {minutes_to_next_point} 分鐘"
        }), 200

    except Exception as e:
        return jsonify({"message": f"發生錯誤: {str(e)}"}), 500



# 查詢打卡紀錄 API
@app.route('/records/<username>', methods=['GET'])
def get_records(username):
    try:
        db = read_data ()

        if username not in db or not db[username]:
            return jsonify({
                "message": "沒有此使用者的打卡紀錄",
                "records": [],
                "points": 0,
                "total_worked_time": "0 小時 0 分鐘",
                "minutes_to_next_point": 240
            }), 404

        user_data = db[username]
        records = user_data.get("records", [])
        total_worked_minutes = user_data.get("total_worked_minutes", 0)
        points = user_data.get("points", 0)

        # 計算累積總工時
        total_hours = total_worked_minutes // 60
        total_minutes = total_worked_minutes % 60
        total_worked_time = f"{total_hours} 小時 {total_minutes} 分鐘"

        # 計算距離下一個積分還差多少分鐘
        minutes_to_next_point = 240 - (db[username]["total_worked_minutes"] % 240)

        # 確保積分計算正確
        print(f"User {username} total worked minutes: {total_worked_minutes}")
        print(f"Minutes to next point: {minutes_to_next_point}")
       
        return jsonify({
            "records": records,
            "points": points,
            "total_worked_time": total_worked_time,
            "minutes_to_next_point": minutes_to_next_point
        })
    except Exception as e:
        return jsonify({"message": f"查詢紀錄發生錯誤: {str(e)}"}), 500

   
@app.route('/points/<username>', methods=['GET'])
def get_points(username):
    db = read_data()
    if username not in db:
        return jsonify({"message": "沒有找到此使用者的紀錄"}), 404
    
    # 獲取使用者的積分與總工時
    user_data = db[username]
    points = user_data.get("points", 0)
    total_worked_minutes = user_data.get("total_worked_minutes", 0)

    # 返回積分與總工時
    return jsonify({
        "points": points,
        "total_worked_minutes": total_worked_minutes
    })

@app.route('/redeem/<username>/<int:points>', methods=['POST'])
def redeem_gift(username, points):
    db = read_data()
    if username not in db:
        return jsonify({"message": "使用者不存在"}), 400

    if db[username]['points'] < points:
        return jsonify({"message": "積分不足，無法兌換獎勵"}), 400

    # ✅ 記錄已兌換的積分
    if "redeemed_points" not in db[username]:
        db[username]["redeemed_points"] = 0
    db[username]["redeemed_points"] += points

    # ✅ 更新剩餘積分
    db[username]['points'] -= points

    if not write_data(db):
        return jsonify({"message": "儲存資料時發生錯誤"}), 500

    return jsonify({"message": f"成功兌換獎勵，扣除 {points} 積分！"}), 200


# 首頁
@app.route('/')
def home():
    return render_template('index.html')

# 錯誤處理
@app.errorhandler(404)
def not_found(error):
    return jsonify({"message": "路徑未找到"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"message": "伺服器內部錯誤"}), 500

if __name__ == '__main__':
    app.run(debug=True,port=5050)
