import logging
from datetime import date

from fastapi import APIRouter,Depends, HTTPException, Query

from app.core.config import settings
from app.llm.analysis import (
    BASIS_METADATA,BASIS_NARRATIVE,analyze_metadata,analyze_narrative
)
from app.llm.client import LLMError

from app.db import pool
from app.deps import get_current_user


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/complaints", tags=["complaints"],dependencies=[Depends(get_current_user)]) #every complaints endpoints need a login

LIST_COLUMNS = (
    "complaint_id, date_received, product, sub_product, issue, company, "
    "state, submitted_via, company_response_to_consumer, timely_response"
)


@router.get("")
def list_complaints(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    product: str | None = None,
    company: str | None = None,
    state: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    q: str | None = None,
):
    conditions = []
    params = []

    if product:
        conditions.append("product = %s")
        params.append(product)
    if company:
        conditions.append("company ILIKE %s")
        params.append(f"%{company}%")
    if state:
        conditions.append("state = %s")
        params.append(state.upper())
    if date_from:
        conditions.append("date_received >= %s")
        params.append(date_from)
    if date_to:
        conditions.append("date_received <= %s")
        params.append(date_to)
    if q:
        conditions.append("(issue ILIKE %s OR sub_issue ILIKE %s OR company ILIKE %s)")
        params.extend([f"%{q}%"] * 3)

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
    offset = (page - 1) * page_size

    try:
        with pool.connection() as conn:
            total = conn.execute(
                f"SELECT COUNT(*) AS n FROM complaints {where}", params
            ).fetchone()["n"]
            rows = conn.execute(
                f"SELECT {LIST_COLUMNS} FROM complaints {where} "
                "ORDER BY date_received DESC, complaint_id DESC LIMIT %s OFFSET %s",
                [*params, page_size, offset],
            ).fetchall()
    except Exception:
        logger.exception("Database error while listing complaints")
        raise HTTPException(status_code=503, detail="Database is not available. Please try again.")

    return {
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": (total + page_size - 1) // page_size,
        "items": rows,
    }


@router.get("/meta/products")
def list_products():
    try:
        with pool.connection() as conn:
            rows = conn.execute(
                "SELECT product, COUNT(*) AS count FROM complaints "
                "GROUP BY product ORDER BY count DESC"
            ).fetchall()
    except Exception:
        logger.exception("Database error while listing products")
        raise HTTPException(status_code=503, detail="Database is not available. Please try again.")
    return rows


@router.get("/{complaint_id}")
def get_complaint(complaint_id: int):
    try:
        with pool.connection() as conn:
            row = conn.execute(
                "SELECT * FROM complaints WHERE complaint_id = %s", [complaint_id]
            ).fetchone()
            analysis = conn.execute(
                "SELECT category, summary, model,basis FROM complaint_analysis "
                "WHERE complaint_id = %s",
                [complaint_id],
            ).fetchone()
    except Exception:
        logger.exception("Database error while reading a complaint")
        raise HTTPException(status_code=503, detail="Database is not available. Please try again.")

    if row is None:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return {**row,"analysis":analysis}


@router.post("/{complaint_id}/analysis")
def analyze_complaint(complaint_id: int, refresh: bool = False):
    """Classify and summarize one complaint with the AI.

    With a written story we analyze the story. Without one we use only the
    labels (product, issue...). The result is saved, so the AI is called only
    once per complaint. Use ?refresh=true to run it again.
    """
    # Step 1: read. The connection is released BEFORE the slow AI call.
    try:
        with pool.connection() as conn:
            row = conn.execute(
                "SELECT narrative, product, sub_product, issue, sub_issue "
                "FROM complaints WHERE complaint_id = %s",
                [complaint_id],
            ).fetchone()
            saved = conn.execute(
                "SELECT category, summary, model, basis FROM complaint_analysis "
                "WHERE complaint_id = %s",
                [complaint_id],
            ).fetchone()
    except Exception:
        logger.exception("Database error while reading a complaint")
        raise HTTPException(status_code=503, detail="Database is not available. Please try again.")

    if row is None:
        raise HTTPException(status_code=404, detail="Complaint not found")
    if saved and not refresh:
        return {"complaint_id": complaint_id, **saved, "cached": True}

    # Step 2: ask the AI (no database connection is held here).
    narrative = (row["narrative"] or "").strip()
    try:
        if narrative:
            basis = BASIS_NARRATIVE
            result = analyze_narrative(narrative)
        else:
            basis = BASIS_METADATA
            result = analyze_metadata(
                row["product"], row["sub_product"], row["issue"], row["sub_issue"]
            )
    except LLMError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    # Step 3: save the result
    model = settings.llm_model
    try:
        with pool.connection() as conn:
            conn.execute(
                "INSERT INTO complaint_analysis (complaint_id, category, summary, model, basis) "
                "VALUES (%s, %s, %s, %s, %s) "
                "ON CONFLICT (complaint_id) DO UPDATE SET "
                "category = EXCLUDED.category, summary = EXCLUDED.summary, "
                "model = EXCLUDED.model, basis = EXCLUDED.basis, created_at = now()",
                [complaint_id, result["category"], result["summary"], model, basis],
            )
    except Exception:
        logger.exception("Database error while saving the analysis")
        raise HTTPException(status_code=503, detail="Database is not available. Please try again.")

    return {
        "complaint_id": complaint_id,
        **result,
        "model": model,
        "basis": basis,
        "cached": False,
    }