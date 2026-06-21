import sqlite3
import json
import sys

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

db_path = r"C:\Users\Almannai\.n8n\database.sqlite"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Query latest 40 executions
cursor.execute("""
    SELECT executionId, data
    FROM execution_data
    ORDER BY executionId DESC
    LIMIT 40;
""")

rows = cursor.fetchall()
print(f"Total retrieved executions from DB: {len(rows)}")

for row in rows:
    exec_id, data_str = row
    print(f"\n=================== EXECUTION ID: {exec_id} ===================")
    try:
        d = json.loads(data_str)
        if not isinstance(d, list) or len(d) == 0:
            print("  No node execution data.")
            continue
            
        map_dict = d[0]
        result_idx_str = map_dict.get("resultData")
        if not result_idx_str:
            print("  No resultData index found.")
            continue
            
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
            
        deref_result = dereference(result_data)
        run_data = deref_result.get("runData", {})
        
        if not run_data:
            print("  No runs found in execution data.")
            continue
            
        has_relevant_nodes = False
        for node_name, runs in run_data.items():
            if node_name in ["Send Transcript Email", "ElevenLabs Post-Call Webhook", "Lookup Lead Email", "Email Exists?", "Format WhatsApp Payload", "Send WhatsApp Summary (Twilio)"]:
                has_relevant_nodes = True
                
        if not has_relevant_nodes:
            print("  (Only pre-call/google sheets nodes ran in this execution)")
            continue
            
        for node_name, runs in run_data.items():
            for idx, run in enumerate(runs):
                has_error = "error" in run
                error_msg = run["error"].get("message") if has_error else None
                print(f"  Node: {node_name} | Success: {not has_error} | Error: {error_msg}")
                
                # Check for SMTP or Email Send details specifically
                if node_name == "Send Transcript Email" or "Email" in node_name:
                    if "data" in run and "main" in run["data"] and run["data"]["main"]:
                        print(f"    Email Input Items: {json.dumps(run['data']['main'][0], indent=2, ensure_ascii=False)}")
                    if has_error:
                        print(f"    Email Run Error: {json.dumps(run['error'], indent=2, ensure_ascii=False)}")
                
                # Check Twilio/WhatsApp details if failed
                if "WhatsApp" in node_name and has_error:
                    print(f"    WhatsApp Run Error: {json.dumps(run['error'], indent=2, ensure_ascii=False)}")
                    
    except Exception as e:
        print("  Failed to process execution:", e)

conn.close()
