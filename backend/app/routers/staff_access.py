from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import List

from app.database import get_db

router = APIRouter(prefix="/staff-access", tags=["staff_access"])

ADMIN_PASSWORD = "sathy123"  # same admin password used elsewhere

def check_auth(x_admin_password: str = Header(None)):
    if x_admin_password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid password")

@router.get("/")
def list_access(db: Session = Depends(get_db), auth=Depends(check_auth)):
    """Returns every staff/merchant access row for the admin panel."""
    rows = db.execute(text("""
        SELECT sa.id, sa.staff_name, sa.merchant_id, m.name as merchant_name, sa.has_access
        FROM staff_access sa
        JOIN merchants m ON m.id = sa.merchant_id
        ORDER BY m.name, sa.staff_name
    """)).fetchall()
    return [
        {"id": r[0], "staff_name": r[1], "merchant_id": r[2], "merchant_name": r[3], "has_access": r[4]}
        for r in rows
    ]

class ToggleRequest(BaseModel):
    staff_name: str
    merchant_id: int
    has_access: bool

@router.post("/toggle")
def toggle_access(req: ToggleRequest, db: Session = Depends(get_db), auth=Depends(check_auth)):
    db.execute(text("""
        INSERT INTO staff_access (staff_name, merchant_id, has_access, updated_at)
        VALUES (:staff_name, :merchant_id, :has_access, NOW())
        ON CONFLICT (staff_name, merchant_id)
        DO UPDATE SET has_access = :has_access, updated_at = NOW()
    """), {"staff_name": req.staff_name, "merchant_id": req.merchant_id, "has_access": req.has_access})
    db.commit()
    return {"ok": True}

@router.get("/check")
def check_access(staff_name: str, merchant_id: int, db: Session = Depends(get_db)):
    """Public — Dashboard calls this to decide whether to show the Tasks tab."""
    row = db.execute(text("""
        SELECT has_access FROM staff_access
        WHERE staff_name = :staff_name AND merchant_id = :merchant_id
    """), {"staff_name": staff_name, "merchant_id": merchant_id}).fetchone()
    # default to True if no row exists yet (so new staff aren't locked out by accident)
    return {"has_access": row[0] if row else True}
