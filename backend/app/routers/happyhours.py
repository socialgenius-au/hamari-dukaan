from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import HappyHour, Merchant
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

router = APIRouter(prefix="/happyhours", tags=["happyhours"])

class HappyHourCreate(BaseModel):
    merchant_id: int
    title: str
    description: Optional[str] = None
    discount_percent: float
    max_orders: Optional[int] = 25
    start_time: datetime
    end_time: datetime

class HappyHourOut(BaseModel):
    id: int
    merchant_id: int
    title: str
    description: Optional[str]
    discount_percent: float
    max_orders: int
    orders_taken: int
    start_time: datetime
    end_time: datetime
    is_active: bool

    class Config:
        from_attributes = True

@router.get("/", response_model=List[HappyHourOut])
def get_active_happyhours(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    return db.query(HappyHour).filter(
        HappyHour.is_active == True,
        HappyHour.start_time <= now,
        HappyHour.end_time >= now,
        HappyHour.orders_taken < HappyHour.max_orders
    ).all()

@router.post("/", response_model=HappyHourOut)
def create_happyhour(hh: HappyHourCreate, db: Session = Depends(get_db)):
    merchant = db.query(Merchant).filter(Merchant.id == hh.merchant_id).first()
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    db_hh = HappyHour(**hh.dict())
    db.add(db_hh)
    db.commit()
    db.refresh(db_hh)
    return db_hh

@router.post("/{hh_id}/order")
def place_happyhour_order(hh_id: int, db: Session = Depends(get_db)):
    hh = db.query(HappyHour).filter(HappyHour.id == hh_id).first()
    if not hh:
        raise HTTPException(status_code=404, detail="Happy Hour not found")
    if hh.orders_taken >= hh.max_orders:
        raise HTTPException(status_code=400, detail="Happy Hour is sold out")
    hh.orders_taken += 1
    db.commit()
    return {"orders_taken": hh.orders_taken, "remaining": hh.max_orders - hh.orders_taken}

@router.delete("/{hh_id}")
def deactivate_happyhour(hh_id: int, db: Session = Depends(get_db)):
    hh = db.query(HappyHour).filter(HappyHour.id == hh_id).first()
    if not hh:
        raise HTTPException(status_code=404, detail="Not found")
    hh.is_active = False
    db.commit()
    return {"status": "deactivated"}
