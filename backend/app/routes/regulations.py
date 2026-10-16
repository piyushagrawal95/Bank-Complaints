import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.core.config import settings
from app.db import pool
from app.deps import get_current_user
from app.llm.client import LLMError, chat
from fastembed import TextEmbedding

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/regulations",
    tags=["regulations"],
    dependencies=[Depends(get_current_user)],  # Login zaroori hai
)

# Singleton pattern: model baar baar load na ho, memory bache
_embed_model: TextEmbedding | None = None


def get_embed_model() -> TextEmbedding:
    global _embed_model
    if _embed_model is None:
        _embed_model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
    return _embed_model


class AskRuleIn(BaseModel):
    question: str = Field(min_length=3, max_length=1000)
    top_k: int = Field(default=4, ge=1, le=10)


SYSTEM_PROMPT = """You are an expert banking compliance assistant for a bank's complaint resolution team.
Your job is to answer compliance questions strictly using the provided official banking regulations.

Rules:
1. Base your answer ONLY on the provided regulation excerpts. Do not invent or assume rules.
2. Clearly state the exact Section (e.g. § 1005.11) and Page Number in your explanation.
3. Be concise, precise, and professional. State the exact timeframes, deadlines, or customer rights.
4. If the provided excerpts do not contain enough information to answer the question, clearly state:
   "The available regulation documents do not contain specific rules to answer this question."
"""


@router.post("/ask")
def ask_regulation_rule(body: AskRuleIn):
    """Answers a banking rule question using RAG (pgvector similarity + LLM grounded response)."""
    question = body.question.strip()

    # Step 1: Question ka vector embedding nikalo
    try:
        model = get_embed_model()
        query_vector = list(list(model.embed([question]))[0])
    except Exception as exc:
        logger.exception("Failed to generate query embedding")
        raise HTTPException(status_code=500, detail="Failed to process question.")

    # Step 2: pgvector cosine similarity search se top_k relevant chunks laao
    # 1 - (embedding <=> query_vector) calculates cosine similarity score (0 to 1)
    search_sql = """
        SELECT regulation_name, section, page_number, chunk_text,
               ROUND((1 - (embedding <=> %s::vector))::numeric, 4) AS similarity
        FROM regulation_chunks
        ORDER BY embedding <=> %s::vector
        LIMIT %s;
    """

    vector_str = f"[{','.join(str(v) for v in query_vector)}]"

    try:
        with pool.connection() as conn:
            chunks = conn.execute(search_sql, [vector_str, vector_str, body.top_k]).fetchall()
    except Exception:
        logger.exception("Database error while retrieving regulation chunks")
        raise HTTPException(status_code=503, detail="Database is not available. Please try again.")

    if not chunks:
        return {
            "question": question,
            "answer": "No regulation documents are currently indexed in the system.",
            "citations": [],
        }

    # Step 3: LLM ke liye Grounded Context taiyaar karo
    context_blocks = []
    citations = []

    for idx, c in enumerate(chunks, start=1):
        context_blocks.append(
            f"[Source {idx}]: {c['regulation_name']} | {c['section']} (Page {c['page_number']})\n{c['chunk_text']}"
        )
        citations.append({
            "source_id": idx,
            "regulation": c["regulation_name"],
            "section": c["section"],
            "page_number": c["page_number"],
            "similarity": float(c["similarity"]),
            "excerpt": c["chunk_text"][:300] + "...",
        })

    user_prompt = (
        f"Official Regulation Excerpts:\n\n"
        + "\n\n---\n\n".join(context_blocks)
        + f"\n\nEmployee Question: {question}\n\n"
        + "Please provide a direct answer citing the specific Section and Page numbers."
    )

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]

    # Step 4: LLM ko call karo
    try:
        answer = chat(messages, temperature=0.1, max_tokens=700)
    except LLMError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    return {
        "question": question,
        "answer": answer,
        "citations": citations,
        "model": settings.llm_model,
        "provider": settings.llm_provider,
    }