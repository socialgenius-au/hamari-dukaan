from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Product
from pydantic import BaseModel
from typing import Optional, List
import csv
import io
import requests

router = APIRouter(prefix="/products", tags=["products"])

class ProductCreate(BaseModel):
    merchant_id: int
    name: str
    description: Optional[str] = None
    price: float
    category: Optional[str] = None
    emoji: Optional[str] = "📦"
    image_url: Optional[str] = None
    barcode: Optional[str] = None
    stock_qty: Optional[int] = 0

class ProductOut(BaseModel):
    id: int
    merchant_id: int
    name: str
    description: Optional[str]
    price: float
    category: Optional[str]
    emoji: str
    image_url: Optional[str]
    barcode: Optional[str]
    stock_qty: int
    is_active: bool

    class Config:
        from_attributes = True

@router.get("/", response_model=List[ProductOut])
def get_products(category: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Product).filter(Product.is_active == True)
    if category:
        query = query.filter(Product.category == category)
    return query.all()

@router.post("/", response_model=ProductOut)
def create_product(product: ProductCreate, db: Session = Depends(get_db)):
    db_product = Product(**product.dict())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

@router.post("/import-csv")
async def import_csv(merchant_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    decoded = content.decode("utf-8")
    reader = csv.DictReader(io.StringIO(decoded))
    imported = []
    errors = []
    for i, row in enumerate(reader, start=2):
        try:
            if not row.get("name") or not row.get("price"):
                errors.append({"row": i, "reason": "Missing name or price"})
                continue
            product = Product(
                merchant_id=merchant_id,
                name=row["name"].strip(),
                description=row.get("description", "").strip(),
                price=float(row["price"]),
                category=row.get("category", "").strip(),
                emoji=row.get("emoji", "📦").strip(),
                image_url=row.get("image_url", "").strip() or None,
                barcode=row.get("barcode", "").strip() or None,
                stock_qty=int(row.get("stock_qty", 0)),
            )
            db.add(product)
            imported.append(row["name"])
        except Exception as e:
            errors.append({"row": i, "reason": str(e)})
    db.commit()
    return {
        "imported_count": len(imported),
        "imported": imported,
        "error_count": len(errors),
        "errors": errors
    }

@router.post("/import-barcodes")
async def import_barcodes(merchant_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    decoded = content.decode("utf-8")
    reader = csv.DictReader(io.StringIO(decoded))
    imported = []
    errors = []
    for i, row in enumerate(reader, start=2):
        try:
            barcode = row.get("barcode", "").strip()
            price = row.get("price", "").strip()
            if not barcode or not price:
                errors.append({"row": i, "reason": "Missing barcode or price"})
                continue
            response = requests.get(
                f"https://world.openfoodfacts.org/api/v0/product/{barcode}.json",
                timeout=5
            )
            data = response.json()
            if data.get("status") != 1:
                errors.append({"row": i, "reason": f"Barcode {barcode} not found"})
                continue
            p = data["product"]
            product = Product(
                merchant_id=merchant_id,
                name=p.get("product_name", barcode),
                description=p.get("ingredients_text", "")[:300] if p.get("ingredients_text") else None,
                price=float(price),
                category=p.get("categories", "").split(",")[0].strip() if p.get("categories") else None,
                image_url=p.get("image_url"),
                barcode=barcode,
                stock_qty=0,
                emoji="📦"
            )
            db.add(product)
            imported.append(p.get("product_name", barcode))
        except Exception as e:
            errors.append({"row": i, "reason": str(e)})
    db.commit()
    return {
        "imported_count": len(imported),
        "imported": imported,
        "error_count": len(errors),
        "errors": errors
    }

@router.get("/template/csv")
def download_template():
    from fastapi.responses import Response
    csv_content = "name,description,price,category,emoji,image_url,barcode,stock_qty\nBasmati Rice 5kg,Premium long grain basmati,18.99,Rice,🍚,,8901234567890,50\nBiryani Masala,Shan biryani spice mix,4.99,Spices,🌶️,,8901234567891,100\n"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=apnidukaan_product_template.csv"}
    )
