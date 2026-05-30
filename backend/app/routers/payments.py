from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Order, Merchant
from pydantic import BaseModel
from typing import List, Optional
import stripe
import os

router = APIRouter(prefix="/payments", tags=["payments"])

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
COMMISSION_RATE = 0.10

class CheckoutItem(BaseModel):
    product_id: int
    name: str
    price: float
    qty: int
    emoji: Optional[str] = "📦"

class CheckoutRequest(BaseModel):
    merchant_id: int
    buyer_name: str
    buyer_email: str
    buyer_phone: Optional[str] = None
    items: List[CheckoutItem]

@router.post("/create-checkout")
def create_checkout(req: CheckoutRequest, db: Session = Depends(get_db)):
    merchant = db.query(Merchant).filter(Merchant.id == req.merchant_id).first()
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    line_items = []
    for item in req.items:
        line_items.append({
            "price_data": {
                "currency": "aud",
                "product_data": {
                    "name": f"{item.emoji} {item.name}",
                    "description": f"From {merchant.name} — {merchant.suburb}",
                },
                "unit_amount": int(item.price * 100),
            },
            "quantity": item.qty,
        })
    total = sum(item.price * item.qty for item in req.items)
    commission = round(total * COMMISSION_RATE, 2)
    merchant_payout = round(total - commission, 2)
    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        line_items=line_items,
        mode="payment",
        success_url=f"{FRONTEND_URL}/order-success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{FRONTEND_URL}/?cancelled=true",
        customer_email=req.buyer_email,
        metadata={
            "merchant_id": str(req.merchant_id),
            "buyer_name": req.buyer_name,
            "buyer_phone": req.buyer_phone or "",
            "commission": str(commission),
            "merchant_payout": str(merchant_payout),
        }
    )
    return {
        "checkout_url": session.url,
        "session_id": session.id,
        "total": total,
        "commission": commission,
        "merchant_payout": merchant_payout
    }

@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET", "")
    try:
        if webhook_secret:
            event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
        else:
            import json
            event = json.loads(payload)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        metadata = session.get("metadata", {})
        merchant_id = int(metadata.get("merchant_id", 0))
        buyer_name = metadata.get("buyer_name", "")
        buyer_phone = metadata.get("buyer_phone", "")
        buyer_email = session.get("customer_email", "")
        total = session.get("amount_total", 0) / 100
        commission = float(metadata.get("commission", 0))
        merchant_payout = float(metadata.get("merchant_payout", 0))
        order = Order(
            merchant_id=merchant_id,
            buyer_name=buyer_name,
            buyer_email=buyer_email,
            buyer_phone=buyer_phone,
            items=[],
            total=total,
            commission=commission,
            merchant_payout=merchant_payout,
            status="paid",
            stripe_session_id=session.get("id")
        )
        db.add(order)
        db.commit()
    return {"status": "ok"}

@router.get("/session/{session_id}")
def get_session(session_id: str):
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        return {
            "status": session.payment_status,
            "customer_email": session.customer_email,
            "amount_total": session.amount_total / 100,
            "currency": session.currency.upper()
        }
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))
