from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Merchant, Product
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter(prefix="/merchants", tags=["merchants"])

class MerchantCreate(BaseModel):
    name: str
    description: Optional[str] = None
    suburb: str
    category: str
    emoji: Optional[str] = "🏪"
    phone: Optional[str] = None
    email: Optional[str] = None

class MerchantOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    suburb: str
    category: str
    emoji: str
    logo_url: Optional[str]
    phone: Optional[str]
    stripe_connected: bool
    is_active: bool

    class Config:
        from_attributes = True

@router.get("/", response_model=List[MerchantOut])
def get_merchants(category: Optional[str] = None, search: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Merchant).filter(Merchant.is_active == True)
    if category and category != "All":
        query = query.filter(Merchant.category == category)
    if search:
        query = query.filter(
            Merchant.name.ilike(f"%{search}%") |
            Merchant.suburb.ilike(f"%{search}%")
        )
    return query.all()

@router.get("/{merchant_id}", response_model=MerchantOut)
def get_merchant(merchant_id: int, db: Session = Depends(get_db)):
    merchant = db.query(Merchant).filter(Merchant.id == merchant_id).first()
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    return merchant

@router.post("/", response_model=MerchantOut)
def create_merchant(merchant: MerchantCreate, db: Session = Depends(get_db)):
    db_merchant = Merchant(**merchant.dict())
    db.add(db_merchant)
    db.commit()
    db.refresh(db_merchant)
    return db_merchant

@router.get("/{merchant_id}/products")
def get_merchant_products(merchant_id: int, db: Session = Depends(get_db)):
    products = db.query(Product).filter(
        Product.merchant_id == merchant_id,
        Product.is_active == True
    ).all()
    return products

class MerchantUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    suburb: Optional[str] = None
    category: Optional[str] = None
    phone: Optional[str] = None
    abn: Optional[str] = None
    gst_registered: Optional[bool] = None

@router.patch("/{merchant_id}", response_model=MerchantOut)
def update_merchant(merchant_id: int, update: MerchantUpdate, db: Session = Depends(get_db)):
    merchant = db.query(Merchant).filter(Merchant.id == merchant_id).first()
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    for field, value in update.dict(exclude_none=True).items():
        setattr(merchant, field, value)
    db.commit()
    db.refresh(merchant)
    return merchant
