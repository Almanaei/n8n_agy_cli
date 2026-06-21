import sqlite3
import json
import sys

# Reconfigure stdout to use UTF-8 to avoid charmap encoding errors on Windows
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

db_path = r"C:\Users\Almannai\.n8n\database.sqlite"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get execution details
cursor.execute("""
    SELECT executionId, data 
    FROM execution_data 
    ORDER BY executionId DESC 
    LIMIT 3;
""")

for row in cursor.fetchall():
    exec_id, data_str = row
    print(f"\n=================== EXECUTION ID: {exec_id} ===================")
    try:
        d = json.loads(data_str)
        if not isinstance(d, list) or len(d) == 0:
            print("Data is not a list or is empty.")
            continue
            
        map_dict = d[0]
        if not isinstance(map_dict, dict):
            print("First element is not a dict mapping.")
            continue
            
        result_idx_str = map_dict.get("resultData")
        if not result_idx_str:
            print("No resultData index found in map.")
            continue
            
        result_idx = int(result_idx_str)
        result_data = d[result_idx]
        
        # Track visited indices to prevent infinite recursion on circular references
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
        for node_name, runs in run_data.items():
            print(f"\nNode: {node_name}")
            for idx, run in enumerate(runs):
                print(f"  Run {idx}:")
                if "error" in run:
                    print(f"    Error: {json.dumps(run['error'], indent=2, ensure_ascii=False)}")
                if "data" in run and "main" in run["data"] and run["data"]["main"]:
                    output_items = run["data"]["main"][0]
                    if isinstance(output_items, list):
                        print(f"    Output (first 3 items):")
                        for item_idx, item in enumerate(output_items[:3]):
                            if isinstance(item, dict) and "json" in item:
                                print(f"      [{item_idx}]: {json.dumps(item['json'], indent=2, ensure_ascii=False)}")
                            else:
                                print(f"      [{item_idx}]: {json.dumps(item, indent=2, ensure_ascii=False)}")
                    else:
                        print(f"    Output: {json.dumps(output_items, indent=2, ensure_ascii=False)}")
                        
    except Exception as e:
        print("Failed to process execution:", e)

conn.close()
