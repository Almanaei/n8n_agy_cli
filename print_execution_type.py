import sqlite3
import json

db_path = r"C:\Users\Almannai\.n8n\database.sqlite"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT executionId, data FROM execution_data ORDER BY executionId DESC LIMIT 1;")
row = cursor.fetchone()
if row:
    exec_id, data_str = row
    data = json.loads(data_str)
    print("Type of data:", type(data))
    if isinstance(data, list):
        print("List length:", len(data))
        if len(data) > 0:
            print("First item type:", type(data[0]))
            if isinstance(data[0], dict):
                print("First item keys:", data[0].keys())
    elif isinstance(data, dict):
        print("Keys:", data.keys())
        if "resultData" in data:
            print("resultData keys:", data["resultData"].keys())
conn.close()
