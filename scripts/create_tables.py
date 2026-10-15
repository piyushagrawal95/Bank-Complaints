import os
from pathlib import Path

import psycopg
from dotenv import load_dotenv

load_dotenv("backend/.env")
url =os.getenv("DATABASE_URL")

if not url:
    raise SystemExit("DATABASE_URL is empty.")

files=sorted(Path("backend/sql").glob("*.sql"))

with psycopg.connect(url) as conn:
    for f in files:
        print("Running",f.name)
        conn.execute(f.read_text(encoding="utf-8"))
    tables=conn.execute("select table_name from information_schema.tables where table_schema='public' order by table_name").fetchall();


print("Tables in database:",[t[0] for t in tables])