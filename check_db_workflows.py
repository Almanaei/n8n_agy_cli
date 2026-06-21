import sqlite3

db_path = r"C:\Users\Almannai\.n8n\database.sqlite"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute("SELECT id, name, active FROM workflow_entity;")
    rows = cursor.fetchall()
    print("Workflows in database:")
    for r in rows:
         print(f"- ID: {r[0]} | Name: {r[1]} | Active: {r[2]}")
except Exception as e:
    print(f"Error querying workflows: {e}")

conn.close()
