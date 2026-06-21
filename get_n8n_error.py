import sqlite3
import json

db_path = r"C:\Users\Almannai\.n8n\database.sqlite"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT executionId, data FROM execution_data ORDER BY executionId DESC LIMIT 1;")
row = cursor.fetchone()

if row:
    exec_id, data_str = row
    print(f"Execution ID: {exec_id}")
    try:
        data = json.loads(data_str)
        # Find execution node errors
        if "resultData" in data and "runData" in data["resultData"]:
            for node_name, task_runs in data["resultData"]["runData"].items():
                for idx, run in enumerate(task_runs):
                    if "error" in run:
                        print(f"Node '{node_name}' (run {idx}) failed with error:")
                        print(json.dumps(run["error"], indent=2))
        else:
            print(json.dumps(data, indent=2)[:2000])
    except Exception as e:
        print("Failed to parse data JSON:", e)
        print(data_str[:2000])
else:
    print("No execution data found.")

conn.close()
