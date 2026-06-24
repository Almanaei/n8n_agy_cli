import sqlite3
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

db_path = r"C:\Users\Almannai\.n8n\database.sqlite"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

exec_id = 503
cursor.execute("SELECT data FROM execution_data WHERE executionId = ?;", (exec_id,))
row = cursor.fetchone()
if not row:
    print(f"Execution {exec_id} not found.")
    sys.exit()

d = json.loads(row[0])
visited = set()
def dereference(val):
    if isinstance(val, str) and val.isdigit():
        idx = int(val)
        if idx in visited:
            return f"<CircularRef {idx}>"
        if idx < len(d):
            visited.add(idx)
            res = dereference(d[idx])
            visited.remove(idx)
            return res
    elif isinstance(val, dict):
        return {k: dereference(v) for k, v in val.items()}
    elif isinstance(val, list):
        return [dereference(x) for x in val]
    return val

map_dict = d[0]
result_idx = int(map_dict.get("resultData"))
result_data = d[result_idx]

deref_result = dereference(result_data)
run_data = deref_result.get("runData", {})

node_runs = run_data.get("ElevenLabs Webhook", [])
if node_runs:
    run = node_runs[0]
    if "data" in run and "main" in run["data"] and run["data"]["main"]:
        outputs = run["data"]["main"][0]
        if outputs:
            item = outputs[0]
            print("Headers:")
            print(json.dumps(item.get("json", {}).get("headers", {}), indent=2))
            print("\nBody:")
            print(json.dumps(item.get("json", {}).get("body", {}), indent=2, ensure_ascii=False))
else:
    print("No runs for ElevenLabs Webhook.")
conn.close()
