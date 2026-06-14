# backend/app/routers/tasks.py
# Add to your existing FastAPI app:  app.include_router(tasks_router, prefix="/tasks")

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from ..database import get_db   # adjust import to match your project

router = APIRouter()

# ─────────────────────────────────────────────
# MODELS
# ─────────────────────────────────────────────

class StaffNoteUpdate(BaseModel):
    note: str
    updated_by: str   # staff member name

class MessageCreate(BaseModel):
    merchant_id: int
    sender_type: str   # "staff" | "merchant"
    sender_name: str
    body: str

# ─────────────────────────────────────────────
# MIGRATION — run once to add columns + table
# Copy the SQL below and run in your Railway DB
# ─────────────────────────────────────────────
MIGRATION_SQL = """
-- Add task tracking columns to products table
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS staff_note TEXT,
  ADD COLUMN IF NOT EXISTS note_updated_by VARCHAR(100),
  ADD COLUMN IF NOT EXISTS note_updated_at TIMESTAMP;

-- Create messaging table
CREATE TABLE IF NOT EXISTS merchant_messages (
  id            SERIAL PRIMARY KEY,
  merchant_id   INTEGER NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  sender_type   VARCHAR(10) NOT NULL CHECK (sender_type IN ('staff', 'merchant')),
  sender_name   VARCHAR(100) NOT NULL,
  body          TEXT NOT NULL,
  is_read       BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_merchant_messages_merchant
  ON merchant_messages(merchant_id, created_at DESC);
"""

# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────

def score_product(p: dict) -> dict:
    """Return completion criteria for a single product row."""
    criteria = {
        "has_image":       bool(p.get("image_url") or p.get("image")),
        "has_description": bool(p.get("description") and len(str(p.get("description", "")).strip()) > 3),
        "has_price":       bool(p.get("price") and float(p.get("price", 0)) > 0),
        "has_category":    bool(p.get("category") and str(p.get("category", "")).strip()),
        "has_stock":       bool(p.get("stock") is not None and int(p.get("stock", 0)) > 0),
    }
    completed = sum(criteria.values())
    is_live = completed == 5
    return {**criteria, "completed": completed, "total": 5, "is_live": is_live}


# ─────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────

@router.get("/merchant/{merchant_id}/product-tasks")
def get_product_tasks(merchant_id: int, db: Session = Depends(get_db)):
    """
    Returns all products for a merchant with readiness scoring.
    Staff use this to see the full task queue.
    """
    rows = db.execute(
        text("""
            SELECT id, name, image_url, description, price, category, stock,
                   staff_note, note_updated_by, note_updated_at
            FROM products
            WHERE merchant_id = :mid
            ORDER BY name ASC
        """),
        {"mid": merchant_id}
    ).mappings().all()

    products = []
    summary = {"total": 0, "live": 0, "needs_image": 0, "needs_description": 0,
               "needs_price": 0, "needs_category": 0, "needs_stock": 0}

    for row in rows:
        p = dict(row)
        score = score_product(p)
        summary["total"] += 1
        if score["is_live"]:
            summary["live"] += 1
        for key in ["has_image", "has_description", "has_price", "has_category", "has_stock"]:
            if not score[key]:
                summary[f"needs_{key[4:]}"] += 1

        products.append({**p, **score,
                         "note_updated_at": p["note_updated_at"].isoformat() if p.get("note_updated_at") else None})

    return {"products": products, "summary": summary}


@router.patch("/product/{product_id}/staff-note")
def update_staff_note(product_id: int, payload: StaffNoteUpdate, db: Session = Depends(get_db)):
    """Staff adds/updates internal handover note on a product."""
    db.execute(
        text("""
            UPDATE products
            SET staff_note = :note,
                note_updated_by = :by,
                note_updated_at = NOW()
            WHERE id = :pid
        """),
        {"note": payload.note, "by": payload.updated_by, "pid": product_id}
    )
    db.commit()
    return {"ok": True}


@router.get("/merchant/{merchant_id}/messages")
def get_messages(merchant_id: int, db: Session = Depends(get_db)):
    """Get message thread for a merchant."""
    rows = db.execute(
        text("""
            SELECT id, sender_type, sender_name, body, is_read, created_at
            FROM merchant_messages
            WHERE merchant_id = :mid
            ORDER BY created_at ASC
        """),
        {"mid": merchant_id}
    ).mappings().all()
    return [
        {**dict(r), "created_at": r["created_at"].isoformat()}
        for r in rows
    ]


@router.post("/merchant/{merchant_id}/messages")
def send_message(merchant_id: int, payload: MessageCreate, db: Session = Depends(get_db)):
    """Send a message in the merchant thread."""
    result = db.execute(
        text("""
            INSERT INTO merchant_messages (merchant_id, sender_type, sender_name, body)
            VALUES (:mid, :stype, :sname, :body)
            RETURNING id, created_at
        """),
        {"mid": merchant_id, "stype": payload.sender_type,
         "sname": payload.sender_name, "body": payload.body}
    ).fetchone()
    db.commit()
    return {"id": result[0], "created_at": result[1].isoformat()}


@router.patch("/merchant/{merchant_id}/messages/read")
def mark_read(merchant_id: int, db: Session = Depends(get_db)):
    """Mark all merchant messages as read (call when staff opens thread)."""
    db.execute(
        text("UPDATE merchant_messages SET is_read = TRUE WHERE merchant_id = :mid"),
        {"mid": merchant_id}
    )
    db.commit()
    return {"ok": True}
