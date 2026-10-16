"""Ingest Regulation PDF documents into PostgreSQL with pgvector embeddings for RAG."""
import os
import re
import sys
from pathlib import Path

import psycopg
from dotenv import load_dotenv
from fastembed import TextEmbedding
import pypdf

# Load database URL from backend/.env
load_dotenv("backend/.env")
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise SystemExit("DATABASE_URL is missing in backend/.env")

REGULATION_FILE = Path("data/regulations/Regulation_E.pdf")
REGULATION_NAME = "Regulation E (12 CFR Part 1005) - Electronic Fund Transfers"

CHUNK_SIZE = 900
CHUNK_OVERLAP = 150
BATCH_SIZE = 64


def clean_text(text: str) -> str:
    """Normalize whitespace and fix common OCR/PDF artifact characters."""
    text = re.sub(r"\s+", " ", text)
    # Replace non-breaking spaces or replacement characters
    text = text.replace("\u00a0", " ").strip()
    return text


def extract_chunks(pdf_path: Path):
    """Extract page-level chunks with section headers and page numbers."""
    reader = pypdf.PdfReader(str(pdf_path))
    chunks = []
    current_section = "12 CFR Part 1005 - General"

    print(f"Reading {len(reader.pages)} pages from {pdf_path.name}...")
    for page_idx, page in enumerate(reader.pages, start=1):
        raw_text = page.extract_text() or ""
        if not raw_text.strip():
            continue

        # Detect section headings like "§ 1005.11 Procedures for resolving errors" or "1005.11"
        section_match = re.search(r"(?:§|\u00a7|\ufffd)?\s*(1005\.\d+\s+[A-Za-z\s,-]{4,40})", raw_text)
        if section_match:
            detected = "§ " + " ".join(section_match.group(1).split()[:6])
            # Only update if it looks like a real heading
            if len(detected) > 8:
                current_section = detected

        text = clean_text(raw_text)
        if len(text) < 50:
            continue

        # Sliding window chunking
        start = 0
        while start < len(text):
            end = start + CHUNK_SIZE
            chunk_str = text[start:end].strip()

            if len(chunk_str) >= 100:
                chunks.append({
                    "regulation_name": REGULATION_NAME,
                    "section": current_section,
                    "page_number": page_idx,
                    "chunk_text": chunk_str,
                })

            if end >= len(text):
                break
            start += (CHUNK_SIZE - CHUNK_OVERLAP)

    return chunks


def main():
    if not REGULATION_FILE.exists():
        raise SystemExit(f"File not found: {REGULATION_FILE}. Please run scripts/download_regulations.py first.")

    chunks = extract_chunks(REGULATION_FILE)
    print(f"Generated {len(chunks)} text chunks with section and page citations.")

    print("Initializing embedding model (BAAI/bge-small-en-v1.5, 384 dimensions)...")
    embed_model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")

    chunk_texts = [f"{c['section']}: {c['chunk_text']}" for c in chunks]
    print(f"Generating vector embeddings for {len(chunk_texts)} chunks...")
    embeddings = list(embed_model.embed(chunk_texts, batch_size=BATCH_SIZE))

    print("Connecting to database and saving to regulation_chunks...")
    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            # Delete existing records for this regulation to allow clean re-ingestion
            cur.execute("DELETE FROM regulation_chunks WHERE regulation_name = %s", [REGULATION_NAME])
            print(f"Cleared previous entries for '{REGULATION_NAME}'.")

            insert_sql = """
                INSERT INTO regulation_chunks (regulation_name, section, page_number, chunk_text, embedding)
                VALUES (%s, %s, %s, %s, %s)
            """
            rows = [
                (
                    c["regulation_name"],
                    c["section"],
                    c["page_number"],
                    c["chunk_text"],
                    emb.tolist() if hasattr(emb, "tolist") else list(emb),
                )
                for c, emb in zip(chunks, embeddings)
            ]

            cur.executemany(insert_sql, rows)
            conn.commit()

        count = conn.execute("SELECT COUNT(*) FROM regulation_chunks WHERE regulation_name = %s", [REGULATION_NAME]).fetchone()[0]

    print("-" * 50)
    print(f"Successfully ingested {count} chunks for {REGULATION_NAME} with pgvector embeddings!")


if __name__ == "__main__":
    main()
