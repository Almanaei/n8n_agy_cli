import sqlite3
import json

db_path = r"C:\Users\Almannai\.n8n\database.sqlite"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get recent executions
cursor.execute("""
    SELECT e.id, e.status, e.startedAt, ed.data
    FROM execution_entity e
    JOIN execution_data ed ON e.id = ed.executionId
    WHERE e.id >= 421 AND e.id <= 435
    ORDER BY e.id DESC;
""")

for row in cursor.fetchall():
    exec_id = row[0]
    status = row[1]
    started = row[2]
    raw_data = row[3]
    
    # Parse json data
    try:
        d = json.loads(raw_data)
        # Search for body parameters
        body_data = None
        path = "unknown"
        if "leads" in raw_data:
            path = "leads"
        if "feedback" in raw_data:
            path = "feedback"
        if "post-call" in raw_data:
            path = "post-call"
            
        # Try to find webhook inputs
        visited = set()
        def find_body(val):
            if isinstance(val, dict):
                if "body" in val:
                    return val["body"]
                for k, v in val.items():
                    res = find_body(v)
                    if res:
                        return res
            elif isinstance(val, list):
                for x in val:
                    res = find_body(x)
                    if res:
                        return res
            return None
            
        body = find_body(d)
        print(f"ID: {exec_id} | Status: {status} | Started: {started} | Path: {path} | Body: {json.dumps(body, ensure_ascii=False) if body else 'None'}")
    except Exception as ex:
        print(f"ID: {exec_id} | Status: {status} | Started: {started} | Error: {ex}")

conn.close()
