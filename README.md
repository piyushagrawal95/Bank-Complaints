# Complaints

AI-powered web app for a bank's complaints team (CFPB complaints data)

## Tech stack
 
- Frontend : React (Vite)
- Backend : Python (FastAPI)
- Database : PostgreSQL
- LLM : Groq

## Setup

### Backend
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload

Runs at http://127.0.0.1:8000

### Frontend

cd frontend
npm install
npm run dev

Runs at http://localhost:5173