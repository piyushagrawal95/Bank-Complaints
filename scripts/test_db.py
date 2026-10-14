import os

import psycopg
from dotenv import load_dotenv

load_dotenv("backend/.env")
url=os.getenv("DATABASE_URL")

if not url:
    raise SystemExit("DATABASE_URL is empty.Chech env file")

with psycopg.connect(url) as conn:
    print(conn.execute("SELECT version();").fetchone()[0])
    print(conn.execute("SELECT extname from pg_extension WHERE extname='vector';").fetchone())
