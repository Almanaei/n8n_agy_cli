import sqlite3
import json

db_path = r"C:\Users\Almannai\.n8n\database.sqlite"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("--- WORKFLOW HISTORY FOR VBjr7VIF75yUyP45 ---")
cursor.execute("""
    SELECT versionId, createdAt, nodes 
    FROM workflow_history 
    WHERE workflowId = 'VBjr7VIF75yUyP45' 
    ORDER BY createdAt DESC 
    LIMIT 5;
""")

for row in cursor.fetchall():
    version_id, created_at, nodes_str = row
    print(f"\nVersion: {version_id}, Created At: {created_at}")
    try:
        nodes = json.loads(nodes_str)
        # Find Google Sheets node
        for node in nodes:
            if node.get("type") == "n8n-nodes-base.googleSheets":
                print(f"  Node '{node.get('name')}' parameters:")
                print(json.dumps(node.get("parameters"), indent=2, ensure_ascii=False))
                if "credentials" in node:
                    print(f"  Credentials: {json.dumps(node.get('credentials'), indent=2)}")
    except Exception as e:
        print("  Error parsing nodes:", e)

conn.close()
