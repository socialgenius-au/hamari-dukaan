from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Order, Merchant, Product
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import stripe
import os

router = APIRouter(prefix="/payments", tags=["payments"])

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
CARD_SURCHARGE_PERCENT = 0.015
CARD_SURCHARGE_FIXED = 0.00
AFTERPAY_SURCHARGE_PERCENT = 0.06
AFTERPAY_SURCHARGE_FIXED = 0.30
AFTERPAY_MIN_ORDER = 50.00
GST_RATE = 0.10

def get_commission_rate(merchant_id: int, db: Session) -> float:
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    orders_this_month = db.query(Order).filter(
        Order.merchant_id == merchant_id,
        Order.created_at >= month_start,
        Order.status == "paid"
    ).all()
    monthly_gmv = sum(o.total for o in orders_this_month)
    if monthly_gmv <= 4000:
        return 0.10
    else:
        return 0.08

class CheckoutItem(BaseModel):
    product_id: int
    name: str
    price: float
    qty: int
    emoji: Optional[str] = "📦"
    gst_applicable: Optional[bool] = False
    gst_absorbed: Optional[bool] = True

class CheckoutRequest(BaseModel):
    merchant_id: int
    buyer_name: str
    buyer_email: str
    buyer_phone: Optional[str] = None
    items: List[CheckoutItem]
    payment_method: Optional[str] = "card"

class OrderSummaryRequest(BaseModel):
    merchant_id: int
    items: List[CheckoutItem]
    payment_method: Optional[str] = "card"

@router.post("/summary")
def get_order_summary(req: OrderSummaryRequest, db: Session = Depends(get_db)):
    merchant = db.query(Merchant).filter(Merchant.id == req.merchant_id).first()
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")

    subtotal = 0.0
    gst_amount = 0.0
    item_breakdown = []

    for item in req.items:
        item_total = round(item.price * item.qty, 2)
        item_gst = 0.0
        if item.gst_applicable and not item.gst_absorbed:
            item_gst = round(item_total * GST_RATE / (1 + GST_RATE), 2)
            gst_amount += item_gst
        subtotal += item_total
        item_breakdown.append({
            "name": item.name,
            "emoji": item.emoji,
            "qty": item.qty,
            "unit_price": item.price,
            "total": item_total,
            "gst": item_gst,
        })

    subtotal = round(subtotal, 2)
    gst_amount = round(gst_amount, 2)

    if req.payment_method == "afterpay" and subtotal >= AFTERPAY_MIN_ORDER:
        surcharge = round(subtotal * AFTERPAY_SURCHARGE_PERCENT + AFTERPAY_SURCHARGE_FIXED, 2)
        surcharge_label = f"Afterpay fee (6% + $0.30)"
        payment_label = "Pay in 4 fortnightly instalments"
        instalment = round((subtotal + surcharge) / 4, 2)
    else:
        surcharge = round(subtotal * CARD_SURCHARGE_PERCENT + CARD_SURCHARGE_FIXED, 2)
        surcharge_label = "Card processing fee (1.5%)"
        payment_label = "Pay by card"
        instalment = None
        req.payment_method = "card"

    total = round(subtotal + surcharge, 2)
    commission_rate = get_commission_rate(req.merchant_id, db)
    commission = round(subtotal * commission_rate, 2)
    merchant_payout = round(subtotal - commission, 2)

    return {
        "merchant_name": merchant.name,
        "merchant_suburb": merchant.suburb,
        "items": item_breakdown,
        "subtotal": subtotal,
        "gst_amount": gst_amount,
        "gst_note": "GST included in marked prices" if gst_amount > 0 else "All items GST-free",
        "surcharge": surcharge,
        "surcharge_label": surcharge_label,
        "total": total,
        "payment_method": req.payment_method,
        "payment_label": payment_label,
        "instalment": instalment,
        "commission_rate": commission_rate,
        "commission": commission,
        "merchant_payout": merchant_payout,
        "afterpay_available": subtotal >= AFTERPAY_MIN_ORDER,
    }

@router.post("/create-checkout")
def create_checkout(req: CheckoutRequest, db: Session = Depends(get_db)):
    merchant = db.query(Merchant).filter(Merchant.id == req.merchant_id).first()
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")

    subtotal = round(sum(item.price * item.qty for item in req.items), 2)
    gst_amount = 0.0
    for item in req.items:
        if item.gst_applicable and not item.gst_absorbed:
            item_total = item.price * item.qty
            gst_amount += round(item_total * GST_RATE / (1 + GST_RATE), 2)
    gst_amount = round(gst_amount, 2)

    commission_rate = get_commission_rate(req.merchant_id, db)

    if req.payment_method == "afterpay" and subtotal >= AFTERPAY_MIN_ORDER:
        surcharge = round(subtotal * AFTERPAY_SURCHARGE_PERCENT + AFTERPAY_SURCHARGE_FIXED, 2)
        payment_methods = ["afterpay_clearpay"]
        surcharge_label = "Afterpay fee (6% + $0.30)"
    else:
        surcharge = round(subtotal * CARD_SURCHARGE_PERCENT + CARD_SURCHARGE_FIXED, 2)
        payment_methods = ["card"]
        surcharge_label = "Card processing fee (1.5%)"
        req.payment_method = "card"

    total = round(subtotal + surcharge, 2)
    commission = round(subtotal * commission_rate, 2)
    merchant_payout = round(subtotal - commission, 2)

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

    line_items.append({
        "price_data": {
            "currency": "aud",
            "product_data": {
                "name": surcharge_label,
                "description": "Payment processing cost passed on to customer",
            },
            "unit_amount": int(surcharge * 100),
        },
        "quantity": 1,
    })

    session = stripe.checkout.Session.create(
        payment_method_types=payment_methods,
        line_items=line_items,
        mode="payment",
        success_url=f"{FRONTEND_URL}/order-success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{FRONTEND_URL}/?cancelled=true",
        customer_email=req.buyer_email,
        metadata={
            "merchant_id": str(req.merchant_id),
            "buyer_name": req.buyer_name,
            "buyer_phone": req.buyer_phone or "",
            "subtotal": str(subtotal),
            "gst_amount": str(gst_amount),
            "surcharge": str(surcharge),
            "commission_rate": str(commission_rate),
            "commission": str(commission),
            "merchant_payout": str(merchant_payout),
            "payment_method": req.payment_method,
        }
    )

    return {
        "checkout_url": session.url,
        "session_id": session.id,
        "subtotal": subtotal,
        "gst_amount": gst_amount,
        "surcharge": surcharge,
        "total": total,
        "commission_rate": commission_rate,
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
        subtotal = float(metadata.get("subtotal", total))
        gst_amount = float(metadata.get("gst_amount", 0))
        surcharge = float(metadata.get("surcharge", 0))
        commission_rate = float(metadata.get("commission_rate", 0.10))
        commission = float(metadata.get("commission", 0))
        merchant_payout = float(metadata.get("merchant_payout", 0))
        payment_method = metadata.get("payment_method", "card")

        order = Order(
            merchant_id=merchant_id,
            buyer_name=buyer_name,
            buyer_email=buyer_email,
            buyer_phone=buyer_phone,
            items=[],
            subtotal=subtotal,
            gst_amount=gst_amount,
            surcharge=surcharge,
            total=total,
            commission_rate=commission_rate,
            commission=commission,
            merchant_payout=merchant_payout,
            payment_method=payment_method,
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
