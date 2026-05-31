from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from app.database import get_db, Base
from datetime import datetime

router = APIRouter(prefix="/promo", tags=["promo"])

class PromoCode(Base):
    __tablename__ = "promo_codes"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, nullable=False)
    discount_percent = Column(Float, nullable=False)
    is_active = Column(Boolean, default=True)
    usage_limit = Column(Integer, nullable=True)
    times_used = Column(Integer, default=0)
    expiry_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

@router.get("/validate")
def validate_promo(code: str, db: Session = Depends(get_db)):
    promo = db.query(PromoCode).filter(
        PromoCode.code == code.upper().strip()
    ).first()

    if not promo:
        raise HTTPException(status_code=404, detail="Promo code not found")

    if not promo.is_active:
        raise HTTPException(status_code=400, detail="Promo code is no longer active")

    if promo.expiry_date and promo.expiry_date < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Promo code has expired")

    if promo.usage_limit and promo.times_used >= promo.usage_limit:
        raise HTTPException(status_code=400, detail="Promo code usage limit reached")

    return {
        "valid": True,
        "code": promo.code,
        "discount_percent": promo.discount_percent,
        "message": f"{int(promo.discount_percent)}% off your order"
    }

@router.get("/all")
def get_all_promos(db: Session = Depends(get_db)):
    promos = db.query(PromoCode).all()
    return [{
        "id": p.id,
        "code": p.code,
        "discount_percent": p.discount_percent,
        "is_active": p.is_active,
        "usage_limit": p.usage_limit,
        "times_used": p.times_used,
        "expiry_date": p.expiry_date
    } for p in promos]
