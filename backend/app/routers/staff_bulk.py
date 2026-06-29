from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Product, Merchant
from pydantic import BaseModel
from typing import Optional, List
import os

router = APIRouter(prefix="/staff/bulk", tags=["staff-bulk"])

ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "apnidukaan-admin-2026")

def verify_staff(x_admin_password: str = Header(...)):
    if x_admin_password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid admin password")
    return True


@router.get("/products")
def list_all_products(db: Session = Depends(get_db), _=Depends(verify_staff)):
    products = db.query(Product).join(Merchant, Product.merchant_id == Merchant.id).all()
    result = []
    for p in products:
        result.append({
            "id": p.id,
            "merchant_id": p.merchant_id,
            "merchant_name": p.merchant.name if p.merchant else "Unknown",
            "name": p.name,
            "emoji": p.emoji or "📦",
            "category": p.category,
            "price": p.price,
            "stock_qty": p.stock_qty,
            "is_active": p.is_active,
        })
    return result


class ProductUpdate(BaseModel):
    id: int
    price: Optional[float] = None
    stock_qty: Optional[int] = None
    is_active: Optional[bool] = None


class BulkUpdateRequest(BaseModel):
    updates: List[ProductUpdate]


@router.patch("/products")
def bulk_update_products(
    body: BulkUpdateRequest,
    db: Session = Depends(get_db),
    _=Depends(verify_staff),
):
    if not body.updates:
        return {"updated": 0}

    ids = [u.id for u in body.updates]
    products = {p.id: p for p in db.query(Product).filter(Product.id.in_(ids)).all()}

    updated = 0
    for u in body.updates:
        p = products.get(u.id)
        if not p:
            continue
        if u.price is not None:
            p.price = u.price
        if u.stock_qty is not None:
            p.stock_qty = u.stock_qty
        if u.is_active is not None:
            p.is_active = u.is_active
        updated += 1

    db.commit()
    return {"updated": updated}
