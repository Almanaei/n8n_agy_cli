import sqlite3
import json
import sys

# Configure stdout to ignore encoding errors
sys.stdout.reconfigure(errors='replace')

db_path = r"C:\Users\Almannai\.n8n\database.sqlite"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get the last 15 executions
cursor.execute("""
    SELECT e.id, w.name, e.status, e.mode, e.startedAt 
    FROM execution_entity e
    LEFT JOIN workflow_entity w ON e.workflowId = w.id
    WHERE e.id >= 500
    ORDER BY e.id DESC;
""")
rows = cursor.fetchall()

print(f"Inspecting {len(rows)} executions:")
for row in rows:
    exec_id = row[0]
    workflow_name = row[1]
    status = row[2]
    mode = row[3]
    started = row[4]
    print(f"\n==================================================")
    print(f"ID: {exec_id} | Workflow: {workflow_name} | Status: {status} | Started: {started}")
    
    # Query execution data
    cursor.execute("SELECT data FROM execution_data WHERE executionId = ?;", (exec_id,))
    data_row = cursor.fetchone()
    if not data_row:
        print("No execution data found.")
        continue
        
    try:
        d = json.loads(data_row[0])
        
        # Recursive dereferencer
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
        
        print("Executed Nodes:")
        for node_name, runs in run_data.items():
            print(f"  - Node: {node_name}")
            for idx, run in enumerate(runs):
                has_error = "error" in run
                print(f"    Run {idx}: Success={not has_error}")
                if has_error:
                    print(f"      Error: {run['error']}")
                # If outputs are present, print keys of output
                if "data" in run and "main" in run["data"] and run["data"]["main"]:
                    outputs = run["data"]["main"][0]
                    if isinstance(outputs, list) and len(outputs) > 0:
                        first = outputs[0]
                        if isinstance(first, dict) and "json" in first:
                            print(f"      Output keys: {list(first['json'].keys())}")
                            for k, v in first['json'].items():
                                print(f"        {k}: {str(v)[:150]}")
    except Exception as ex:
        print(f"Error parsing execution data: {ex}")

conn.close()
