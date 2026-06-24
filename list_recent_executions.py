import sqlite3
import sys

db_path = r"C:\Users\Almannai\.n8n\database.sqlite"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("""
    SELECT e.id, w.name, e.status, e.startedAt 
    FROM execution_entity e
    LEFT JOIN workflow_entity w ON e.workflowId = w.id
    ORDER BY e.id DESC 
    LIMIT 10;
""")
rows = cursor.fetchall()

print("Recent 10 executions:")
print(f"{'ID':<6} | {'Workflow Name':<45} | {'Status':<10} | {'Started At':<25}")
print("-" * 95)
for row in rows:
    exec_id, name, status, started = row
    name = name if name else "Unknown"
    print(f"{exec_id:<6} | {name:<45} | {status:<10} | {started:<25}")

conn.close()
