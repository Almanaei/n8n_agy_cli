import sqlite3
import json
import sys

# Reconfigure stdout to use UTF-8
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

db_path = r"C:\Users\Almannai\.n8n\database.sqlite"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get recent executions across all workflows
cursor.execute("""
    SELECT e.id, e.workflowId, w.name, e.status, e.mode, e.startedAt 
    FROM execution_entity e
    LEFT JOIN workflow_entity w ON e.workflowId = w.id
    ORDER BY e.id DESC 
    LIMIT 10;
""")

print("Recent executions in database:")
for row in cursor.fetchall():
    print(f"ID: {row[0]} | Workflow: {row[1]} ({row[2]}) | Status: {row[3]} | Mode: {row[4]} | Started: {row[5]}")

conn.close()
