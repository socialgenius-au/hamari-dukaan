from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Merchant
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
from jose import JWTError, jwt
import hashlib
import secrets
import os

router = APIRouter(prefix="/auth", tags=["auth"])

SECRET_KEY = os.getenv("SECRET_KEY", "apnidukaan-secret-key-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

def hash_password(password: str) -> str:
    salt = secrets.token_hex(32)
    hashed = hashlib.sha256(f"{salt}{password}".encode()).hexdigest()
    return f"{salt}:{hashed}"

def verify_password(password: str, hashed: str) -> bool:
    try:
        salt, hash_val = hashed.split(":")
        return hashlib.sha256(f"{salt}{password}".encode()).hexdigest() == hash_val
    except:
        return False

class MerchantRegister(BaseModel):
    name: str
    email: str
    password: str
    phone: Optional[str] = None
    suburb: str
    category: str
    emoji: Optional[str] = "🏪"
    description: Optional[str] = None
    abn: Optional[str] = None

class MerchantLogin(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    merchant_id: int
    merchant_name: str

def create_token(merchant_id: int) -> str:
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    return jwt.encode({"sub": str(merchant_id), "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str) -> int:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return int(payload.get("sub"))
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.post("/register", response_model=TokenResponse)
def register(data: MerchantRegister, db: Session = Depends(get_db)):
    existing = db.query(Merchant).filter(Merchant.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed = hash_password(data.password)
    merchant = Merchant(
        name=data.name,
        email=data.email,
        password_hash=hashed,
        phone=data.phone,
        suburb=data.suburb,
        category=data.category,
        emoji=data.emoji,
        description=data.description,
        abn=data.abn,
        is_active=True
    )
    db.add(merchant)
    db.commit()
    db.refresh(merchant)
    token = create_token(merchant.id)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        merchant_id=merchant.id,
        merchant_name=merchant.name
    )

@router.post("/login", response_model=TokenResponse)
def login(data: MerchantLogin, db: Session = Depends(get_db)):
    merchant = db.query(Merchant).filter(Merchant.email == data.email).first()
    if not merchant or not merchant.password_hash:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not verify_password(data.password, merchant.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(merchant.id)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        merchant_id=merchant.id,
        merchant_name=merchant.name
    )

@router.get("/me")
def get_me(token: str, db: Session = Depends(get_db)):
    merchant_id = verify_token(token)
    merchant = db.query(Merchant).filter(Merchant.id == merchant_id).first()
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    return {
        "id": merchant.id,
        "name": merchant.name,
        "email": merchant.email,
        "suburb": merchant.suburb,
        "category": merchant.category,
        "emoji": merchant.emoji,
        "phone": merchant.phone,
        "abn": merchant.abn,
        "stripe_connected": merchant.stripe_connected,
        "is_active": merchant.is_active
    }
