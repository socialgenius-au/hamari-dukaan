# backend/app/routers/image_upload.py

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
import boto3
from botocore.config import Config
import os
import uuid
from PIL import Image
import io

router = APIRouter()

# ── R2 client ────────────────────────────────────────────────────────────────

def get_r2_client():
    return boto3.client(
        's3',
        endpoint_url=os.getenv('R2_ENDPOINT_URL'),
        aws_access_key_id=os.getenv('R2_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('R2_SECRET_ACCESS_KEY'),
        config=Config(signature_version='s3v4'),
        region_name='auto'
    )

BUCKET = os.getenv('R2_BUCKET_NAME', 'hamari-dukaan-images')
PUBLIC_URL = os.getenv('R2_PUBLIC_URL', '')

# ── Image compression helper ──────────────────────────────────────────────────

def compress_image(file_bytes: bytes, max_size: int = 800) -> bytes:
    """Resize image to max 800px wide and compress to JPEG."""
    try:
        img = Image.open(io.BytesIO(file_bytes))
        # Convert RGBA/P to RGB
        if img.mode in ('RGBA', 'P', 'LA'):
            img = img.convert('RGB')
        # Resize if too large
        if img.width > max_size or img.height > max_size:
            img.thumbnail((max_size, max_size), Image.LANCZOS)
        # Save as JPEG
        output = io.BytesIO()
        img.save(output, format='JPEG', quality=85, optimize=True)
        return output.getvalue()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Image processing failed: {str(e)}")

# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/upload/product-image/{product_id}")
async def upload_product_image(
    product_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload product image to Cloudflare R2 and update product record."""
    
    # Validate file type
    allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG and WebP images allowed")
    
    # Read and compress
    file_bytes = await file.read()
    if len(file_bytes) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(status_code=400, detail="File too large. Max 10MB.")
    
    compressed = compress_image(file_bytes)
    
    # Generate unique filename
    ext = 'jpg'
    filename = f"products/{product_id}/{uuid.uuid4().hex}.{ext}"
    
    # Upload to R2
    try:
        r2 = get_r2_client()
        r2.put_object(
            Bucket=BUCKET,
            Key=filename,
            Body=compressed,
            ContentType='image/jpeg',
            CacheControl='public, max-age=31536000'
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
    
    # Build public URL
    image_url = f"{PUBLIC_URL}/{filename}"
    
    # Update product in DB
    db.execute(
        text("UPDATE products SET image_url = :url WHERE id = :pid"),
        {"url": image_url, "pid": product_id}
    )
    db.commit()
    
    return {"ok": True, "image_url": image_url}


@router.delete("/upload/product-image/{product_id}")
async def delete_product_image(product_id: int, db: Session = Depends(get_db)):
    """Remove product image from R2 and clear from DB."""
    
    # Get current image URL
    row = db.execute(
        text("SELECT image_url FROM products WHERE id = :pid"),
        {"pid": product_id}
    ).fetchone()
    
    if not row or not row[0]:
        raise HTTPException(status_code=404, detail="No image found")
    
    # Extract key from URL
    image_url = row[0]
    key = image_url.replace(f"{PUBLIC_URL}/", "")
    
    # Delete from R2
    try:
        r2 = get_r2_client()
        r2.delete_object(Bucket=BUCKET, Key=key)
    except Exception:
        pass  # Don't fail if R2 delete fails
    
    # Clear from DB
    db.execute(
        text("UPDATE products SET image_url = NULL WHERE id = :pid"),
        {"pid": product_id}
    )
    db.commit()
    
    return {"ok": True}
