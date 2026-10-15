import logging
from datetime import date

from fastapi import APIRouter, HTTPException, Query

from app.db import pool

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/complaints", tags=["complaints"])

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
    except Exception:
        logger.exception("Database error while reading a complaint")
        raise HTTPException(status_code=503, detail="Database is not available. Please try again.")

    if row is None:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return row