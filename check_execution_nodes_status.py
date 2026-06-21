import sqlite3
import json
import sys

# Reconfigure stdout to use UTF-8
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

db_path = r"C:\Users\Almannai\.n8n\database.sqlite"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get execution details for ID 234
cursor.execute("SELECT data FROM execution_data WHERE executionId = 234;")
row = cursor.fetchone()
if not row:
    print("Execution 231 not found in database.")
    sys.exit()

d = json.loads(row[0])
map_dict = d[0]
result_idx = int(map_dict.get("resultData"))
result_data = d[result_idx]

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

deref_result = dereference(result_data)
run_data = deref_result.get("runData", {})

print("Node Execution Summary for Execution 231:")
for node_name, runs in run_data.items():
    print(f"\n- Node: {node_name}")
    for idx, run in enumerate(runs):
        has_error = "error" in run
        error_msg = run["error"].get("message") if has_error else None
        print(f"  Run {idx}: Success={not has_error} | Error={error_msg}")
        
        # Check node outputs
        if "data" in run and "main" in run["data"] and run["data"]["main"]:
            outputs = run["data"]["main"][0]
            if isinstance(outputs, list):
                print(f"    Output Items Count: {len(outputs)}")
                if len(outputs) > 0:
                    first_item = outputs[0]
                    if isinstance(first_item, dict) and "json" in first_item:
                        print(f"    First Item Keys: {list(first_item['json'].keys())}")
                        # Print selected safe keys
                        safe_keys = ["Client Name", "Client Email", "Phone Number", "whatsappNumber", "status", "message"]
                        for sk in safe_keys:
                            if sk in first_item['json']:
                                print(f"      {sk}: {first_item['json'][sk]}")
                    else:
                        print(f"    First Item: {str(first_item)[:200]}")
            else:
                print(f"    Output: {str(outputs)[:200]}")

conn.close()
