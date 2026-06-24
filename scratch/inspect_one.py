import sqlite3
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

db_path = r"C:\Users\Almannai\.n8n\database.sqlite"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

exec_id = 510
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

print(f"Nodes in execution {exec_id}:")
for node_name, runs in run_data.items():
    print(f"\n- Node: {node_name}")
    for idx, run in enumerate(runs):
        has_error = "error" in run
        print(f"  Run {idx}: Success={not has_error}")
        if "data" in run and "main" in run["data"] and run["data"]["main"]:
            outputs = run["data"]["main"][0]
            if isinstance(outputs, list) and len(outputs) > 0:
                first = outputs[0]
                if isinstance(first, dict) and "json" in first:
                    for k, v in first['json'].items():
                        print(f"    {k}: {v}")
conn.close()
