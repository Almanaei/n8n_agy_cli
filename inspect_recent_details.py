import sqlite3
import json

db_path = r"C:\Users\Almannai\.n8n\database.sqlite"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("""
    SELECT e.id, e.status, e.startedAt, ed.data
    FROM execution_entity e
    JOIN execution_data ed ON e.id = ed.executionId
    WHERE e.id >= 427 AND e.id <= 435
    ORDER BY e.id DESC;
""")

out_lines = []
for row in cursor.fetchall():
    exec_id = row[0]
    status = row[1]
    started = row[2]
    raw_data = row[3]
    
    try:
        d = json.loads(raw_data)
        
        # Dereferencer
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
        run_data = dereference(result_data.get("runData", {}))
        
        # Get Webhook input body
        webhook_node = "ElevenLabs Webhook" if "ElevenLabs Webhook" in run_data else ("Feedback Webhook" if "Feedback Webhook" in run_data else "ElevenLabs Post-Call Webhook")
        runs = run_data.get(webhook_node, [])
        if runs and "data" in runs[0] and "main" in runs[0]["data"] and runs[0]["data"]["main"]:
            body = runs[0]["data"]["main"][0][0].get("json", {}).get("body", {})
            out_lines.append(f"ID: {exec_id} | Node: {webhook_node} | Body: {json.dumps(body, ensure_ascii=False)}")
        else:
            out_lines.append(f"ID: {exec_id} | Node: {webhook_node} | No run details")
    except Exception as ex:
         out_lines.append(f"ID: {exec_id} | Error: {ex}")

with open("recent_details_output.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(out_lines))
print("Wrote output to recent_details_output.txt")
conn.close()
