import os
from pathlib import Path

import psycopg
from dotenv import load_dotenv

load_dotenv("backend/.env")
url=os.getenv("DATABASE_URL")

if not url:
    raise SystemExit("Database_URL is empty.Please check env file")

sql=Path("backend/sql/create_complaints.sql").read_text(encoding="utf-8")

with psycopg.connect(url) as conn:
    conn.execute(sql)
    rows=conn.execute("""
        Select column_name,data_type,is_nullable from information_schema.columns where table_name='complaints' order by ordinal_position""").fetchall()


for row in rows:
    print(row)