from contextlib import asynccontextmanager

from fastapi import FastAPI,HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db import pool
from app.routes import ai,auth,complaints,trends

@asynccontextmanager
async def lifespan(app:FastAPI):
    pool.open()  # open database connections when the app starts
    yield
    pool.close() #close them when the app stops

app=FastAPI(title=settings.app_name,description="AI-powered complaint handling for banks",lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin,"http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"] 
)

app.include_router(complaints.router)
app.include_router(auth.router)
app.include_router(trends.router)
app.include_router(ai.router)

@app.get("/health")
def health():
    return {"status":"ok"}

@app.get("/health/db")
def health_db():
    try:
        with pool.connection() as conn:
            conn.execute("select 1")
    except Exception:
        raise HTTPException(status_code=503,detail="Database is not available")

    return {"status":"ok"}