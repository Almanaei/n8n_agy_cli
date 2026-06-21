import sqlite3
import json

db_path = r"C:\Users\Almannai\.n8n\database.sqlite"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get execution details
cursor.execute("""
    SELECT executionId, data 
    FROM execution_data 
    ORDER BY executionId DESC 
    LIMIT 5;
""")

for row in cursor.fetchall():
    exec_id, data_str = row
    print(f"\n=================== EXECUTION ID: {exec_id} ===================")
    try:
        data_list = json.loads(data_str)
        if not isinstance(data_list, list):
            data_list = [data_list]
            
        for attempt_idx, data in enumerate(data_list):
            print(f"\nAttempt {attempt_idx}:")
            # Find which nodes ran and what their data was
            run_data = data.get("resultData", {}).get("runData", {})
            for node_name, runs in run_data.items():
                print(f"  Node: {node_name}")
                for idx, run in enumerate(runs):
                    print(f"    Run {idx}:")
                    if "error" in run:
                        print(f"      Error: {json.dumps(run['error'], indent=2, ensure_ascii=False)}")
                    if "data" in run and "main" in run["data"] and run["data"]["main"]:
                        output_items = run["data"]["main"][0] # list of items in first output
                        if isinstance(output_items, list):
                            print(f"      Output (first 3 items):")
                            for item_idx, item in enumerate(output_items[:3]):
                                if isinstance(item, dict) and "json" in item:
                                    print(f"        [{item_idx}]: {json.dumps(item['json'], indent=2, ensure_ascii=False)}")
                                else:
                                    print(f"        [{item_idx}]: {json.dumps(item, indent=2, ensure_ascii=False)}")
                        else:
                            print(f"      Output: {json.dumps(output_items, indent=2, ensure_ascii=False)}")
    except Exception as e:
        print("Failed to parse/process execution:", e)

conn.close()
