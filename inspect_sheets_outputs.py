import sqlite3
import json

db_path = r"C:\Users\Almannai\.n8n\database.sqlite"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("""
    SELECT e.id, e.status, ed.data
    FROM execution_entity e
    JOIN execution_data ed ON e.id = ed.executionId
    WHERE e.id >= 470 AND e.id <= 476
    ORDER BY e.id DESC;
""")

out_lines = []
for row in cursor.fetchall():
    exec_id = row[0]
    status = row[1]
    raw_data = row[2]
    
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
        
        # Get Google Sheets node outputs
        sheets_runs = run_data.get("Google Sheets", [])
        if sheets_runs:
            run = sheets_runs[0]
            if "error" in run:
                out_lines.append(f"ID: {exec_id} | Google Sheets | Error: {run['error']}")
            elif "data" in run and "main" in run["data"] and run["data"]["main"]:
                item_list = run["data"]["main"][0]
                if item_list:
                    json_data = item_list[0].get("json", {})
                    out_lines.append(f"ID: {exec_id} | Google Sheets | Output: {json.dumps(json_data, ensure_ascii=False)}")
                else:
                    out_lines.append(f"ID: {exec_id} | Google Sheets | Empty output list")
            else:
                out_lines.append(f"ID: {exec_id} | Google Sheets | No output data")
        else:
            out_lines.append(f"ID: {exec_id} | Google Sheets node did not run")
    except Exception as ex:
         out_lines.append(f"ID: {exec_id} | Error: {ex}")

with open("sheets_outputs.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(out_lines))
print("Wrote output to sheets_outputs.txt")
conn.close()
