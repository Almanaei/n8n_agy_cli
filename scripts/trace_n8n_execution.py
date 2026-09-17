import sqlite3
import json
import sys

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

db_path = r"C:\Users\Almannai\.n8n\database.sqlite"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

def trace_execution(exec_id=None):
    if exec_id is None:
        cursor.execute("SELECT id FROM execution_entity ORDER BY id DESC LIMIT 1;")
        row = cursor.fetchone()
        if not row:
            print("No executions found.")
            return
        exec_id = row[0]

    # Fetch execution entity metadata
    cursor.execute("""
        SELECT e.id, w.name, e.status, e.startedAt, e.stoppedAt, w.id 
        FROM execution_entity e
        LEFT JOIN workflow_entity w ON e.workflowId = w.id
        WHERE e.id = ?;
    """, (exec_id,))
    meta = cursor.fetchone()
    if not meta:
        print(f"Execution {exec_id} not found in execution_entity.")
        return

    print("=" * 80)
    print(f"EXECUTION TRACE: ID #{meta[0]}")
    print(f"Workflow: {meta[1]} (Workflow ID: {meta[5]})")
    print(f"Status:   {meta[2].upper()}")
    print(f"Started:  {meta[3]}")
    print(f"Stopped:  {meta[4]}")
    print("=" * 80)

    # Fetch execution data
    cursor.execute("SELECT data FROM execution_data WHERE executionId = ?;", (exec_id,))
    row = cursor.fetchone()
    if not row or not row[0]:
        print("No execution data recorded for this run.")
        return

    try:
        d = json.loads(row[0])
        if not isinstance(d, list) or len(d) == 0:
            print("Raw execution data is empty.")
            return

        map_dict = d[0]
        result_idx_str = map_dict.get("resultData")
        if not result_idx_str:
            print("No resultData in execution map.")
            return

        result_idx = int(result_idx_str)
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

        deref = dereference(result_data)
        run_data = deref.get("runData", {})
        
        print(f"\nExecuted Nodes Count: {len(run_data)}")
        step_num = 1
        for node_name, runs in run_data.items():
            print(f"\n[{step_num}] Node: {node_name}")
            step_num += 1
            for run_idx, run in enumerate(runs):
                exec_time = run.get("executionTime", "N/A")
                has_error = "error" in run
                print(f"    Run #{run_idx} | Execution Time: {exec_time}ms | Success: {not has_error}")
                if has_error:
                    err = run["error"]
                    print(f"    ❌ ERROR: {err.get('message')}")
                    if "description" in err and err["description"]:
                        print(f"       Description: {err['description']}")
                
                # Check output data
                if "data" in run and "main" in run["data"] and run["data"]["main"]:
                    main_outputs = run["data"]["main"]
                    for out_idx, branch in enumerate(main_outputs):
                        if branch and isinstance(branch, list):
                            print(f"    -> Output Branch [{out_idx}]: {len(branch)} item(s)")
                            for item_i, item in enumerate(branch[:2]):
                                if isinstance(item, dict) and "json" in item:
                                    keys = list(item["json"].keys())
                                    print(f"       Item #{item_i} Keys ({len(keys)}): {', '.join(keys[:8])}{'...' if len(keys) > 8 else ''}")
                                    # Print key application identifiers if present
                                    for key in ["App ID", "Application ID", "appId", "id", "status", "Service Name", "Client Email"]:
                                        if key in item["json"]:
                                            print(f"          • {key}: {item['json'][key]}")

    except Exception as e:
        print(f"Error parsing execution data: {e}")

if __name__ == "__main__":
    exec_id = int(sys.argv[1]) if len(sys.argv) > 1 else None
    trace_execution(exec_id)
    conn.close()
