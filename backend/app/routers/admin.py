from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.models import Merchant, Order
from pydantic import BaseModel
from typing import Optional
import os

router = APIRouter(prefix="/admin", tags=["admin"])

ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "apnidukaan-admin-2026")

def verify_admin(x_admin_password: str = Header(...)):
    if x_admin_password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid admin password")
    return True

class MerchantAdminUpdate(BaseModel):
    payment_preference: Optional[str] = None
    bank_bsb: Optional[str] = None
    bank_account: Optional[str] = None
    bank_account_name: Optional[str] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None

@router.get("/dashboard")
def admin_dashboard(db: Session = Depends(get_db), _=Depends(verify_admin)):
    merchants = db.query(Merchant).all()
    orders = db.query(Order).all()
    
    total_revenue = sum(o.total or 0 for o in orders)
    total_commission = sum(o.commission or 0 for o in orders)
    total_orders = len(orders)
    
    merchant_data = []
    for m in merchants:
        merchant_orders = [o for o in orders if o.merchant_id == m.id]
        merchant_revenue = sum(o.total or 0 for o in merchant_orders)
        merchant_payout = sum(o.merchant_payout or 0 for o in merchant_orders)
        merchant_commission = sum(o.commission or 0 for o in merchant_orders)
        merchant_data.append({
            "id": m.id,
            "name": m.name,
            "suburb": m.suburb,
            "category": m.category,
            "email": m.email,
            "phone": m.phone,
            "abn": m.abn,
            "gst_registered": m.gst_registered,
            "is_active": m.is_active,
            "stripe_connected": m.stripe_connected,
            "payment_preference": getattr(m, 'payment_preference', 'platform'),
            "bank_bsb": getattr(m, 'bank_bsb', None),
            "bank_account": getattr(m, 'bank_account', None),
            "bank_account_name": getattr(m, 'bank_account_name', None),
            "notes": getattr(m, 'notes', None),
            "total_orders": len(merchant_orders),
            "total_revenue": round(merchant_revenue, 2),
            "total_payout": round(merchant_payout, 2),
            "total_commission": round(merchant_commission, 2),
        })
    
    return {
        "total_merchants": len(merchants),
        "total_orders": total_orders,
        "total_revenue": round(total_revenue, 2),
        "total_commission": round(total_commission, 2),
        "merchants": merchant_data,
        "recent_orders": [{
            "id": o.id,
            "merchant_id": o.merchant_id,
            "buyer_name": o.buyer_name,
            "buyer_email": o.buyer_email,
            "total": o.total,
            "commission": o.commission,
            "merchant_payout": o.merchant_payout,
            "status": o.status,
            "promo_code": o.promo_code,
            "ref_code": getattr(o, 'ref_code', None),
            "created_at": str(o.created_at)
        } for o in sorted(orders, key=lambda x: x.created_at or '', reverse=True)[:20]]
    }

@router.patch("/merchants/{merchant_id}")
def update_merchant_admin(merchant_id: int, update: MerchantAdminUpdate, db: Session = Depends(get_db), _=Depends(verify_admin)):
    merchant = db.query(Merchant).filter(Merchant.id == merchant_id).first()
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    for field, value in update.dict(exclude_none=True).items():
        if hasattr(merchant, field):
            setattr(merchant, field, value)
    db.commit()
    db.refresh(merchant)
    return {"message": "Updated successfully", "merchant_id": merchant_id}

@router.patch("/orders/{order_id}/status")
def admin_update_order(order_id: int, status: str, db: Session = Depends(get_db), _=Depends(verify_admin)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.status = status
    db.commit()
    return {"message": "Order updated", "status": status}

@router.get("/merchants/{merchant_id}/orders")
def get_merchant_orders_admin(merchant_id: int, db: Session = Depends(get_db), _=Depends(verify_admin)):
    orders = db.query(Order).filter(Order.merchant_id == merchant_id).order_by(Order.created_at.desc()).all()
    return [{
        "id": o.id,
        "buyer_name": o.buyer_name,
        "buyer_email": o.buyer_email,
        "buyer_phone": o.buyer_phone,
        "total": o.total,
        "commission": o.commission,
        "merchant_payout": o.merchant_payout,
        "status": o.status,
        "payment_method": o.payment_method,
        "promo_code": o.promo_code,
        "created_at": str(o.created_at)
    } for o in orders]
