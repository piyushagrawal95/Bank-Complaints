from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from app.core.config import settings

#A small pool of reusable database connections

pool=ConnectionPool(
    settings.database_url,
    min_size=1,
    max_size=5,
    open=False,
    kwargs={"row_factory":dict_row}
)