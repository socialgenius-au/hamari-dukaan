import sendgrid
from sendgrid.helpers.mail import Mail
import os

SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
FROM_EMAIL = "orders@apnidukaan.au"
FROM_NAME = "Apni Dukaan"

def send_buyer_confirmation(buyer_email: str, buyer_name: str, order_id: int, total: float, merchant_name: str, merchant_phone: str):
    try:
        sg = sendgrid.SendGridAPIClient(api_key=SENDGRID_API_KEY)
        message = Mail(
            from_email=(FROM_EMAIL, FROM_NAME),
            to_emails=buyer_email,
            subject=f"Order Confirmed #{order_id} — Apni Dukaan",
            html_content=f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #276040; padding: 20px; text-align: center;">
                    <h1 style="color: white; margin: 0;">Apni Dukaan</h1>
                    <p style="color: #E8B84B; margin: 4px 0;">اپنی دکان</p>
                </div>
                <div style="padding: 24px;">
                    <h2 style="color: #276040;">Order Confirmed! ✅</h2>
                    <p>Assalamu Alaikum {buyer_name},</p>
                    <p>Jazakallah khair for your order. Your payment has been confirmed.</p>
                    <div style="background: #F5F0E8; border-radius: 10px; padding: 16px; margin: 16px 0;">
                        <p><strong>Order #:</strong> {order_id}</p>
                        <p><strong>Total Paid:</strong> ${total:.2f} AUD</p>
                        <p><strong>Merchant:</strong> {merchant_name}</p>
                        <p><strong>Merchant Phone:</strong> {merchant_phone}</p>
                    </div>
                    <div style="background: #276040; border-radius: 10px; padding: 16px; margin: 16px 0; color: white;">
                        <h3 style="margin: 0 0 8px;">📦 Collection Instructions</h3>
                        <p style="margin: 0;">Show this email to the merchant when collecting your order. The merchant has been notified and will prepare your items.</p>
                    </div>
                    <p style="color: #9a9a8a; font-size: 12px;">Questions? Reply to this email or contact the merchant directly.</p>
                </div>
                <div style="background: #1a4a30; padding: 16px; text-align: center;">
                    <p style="color: rgba(255,255,255,0.6); font-size: 12px; margin: 0;">Apni Dukaan · apnidukaan.au · Halal · Fresh · Local</p>
                </div>
            </div>
            """
        )
        sg.send(message)
        print(f"Buyer confirmation email sent to {buyer_email}")
    except Exception as e:
        print(f"Failed to send buyer email: {e}")

def send_merchant_notification(merchant_email: str, merchant_name: str, order_id: int, buyer_name: str, buyer_phone: str, total: float, payout: float):
    try:
        sg = sendgrid.SendGridAPIClient(api_key=SENDGRID_API_KEY)
        message = Mail(
            from_email=(FROM_EMAIL, FROM_NAME),
            to_emails=merchant_email,
            subject=f"New Order #{order_id} — {buyer_name} — Apni Dukaan",
            html_content=f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #276040; padding: 20px; text-align: center;">
                    <h1 style="color: white; margin: 0;">New Order! 🎉</h1>
                    <p style="color: #E8B84B; margin: 4px 0;">Apni Dukaan</p>
                </div>
                <div style="padding: 24px;">
                    <h2 style="color: #276040;">You have a new order</h2>
                    <p>Assalamu Alaikum {merchant_name},</p>
                    <p>A new order has been placed and payment confirmed. Please prepare the order for collection.</p>
                    <div style="background: #F5F0E8; border-radius: 10px; padding: 16px; margin: 16px 0;">
                        <p><strong>Order #:</strong> {order_id}</p>
                        <p><strong>Buyer:</strong> {buyer_name}</p>
                        <p><strong>Buyer Phone:</strong> {buyer_phone or 'Not provided'}</p>
                        <p><strong>Order Total:</strong> ${total:.2f} AUD</p>
                        <p><strong>Your Payout:</strong> <span style="color: #276040; font-size: 18px;"><strong>${payout:.2f} AUD</strong></span></p>
                    </div>
                    <div style="background: #276040; border-radius: 10px; padding: 16px; margin: 16px 0; color: white;">
                        <h3 style="margin: 0 0 8px;">📋 Next Steps</h3>
                        <p style="margin: 0;">1. Prepare the order<br>2. Log into your dashboard to mark as Ready<br>3. Buyer will collect and show this confirmation</p>
                    </div>
                    <a href="https://apnidukaan.au/dashboard" style="display: block; background: #E8B84B; color: #1a4a30; text-align: center; padding: 14px; border-radius: 10px; text-decoration: none; font-weight: bold; margin: 16px 0;">View Order in Dashboard →</a>
                </div>
                <div style="background: #1a4a30; padding: 16px; text-align: center;">
                    <p style="color: rgba(255,255,255,0.6); font-size: 12px; margin: 0;">Apni Dukaan · apnidukaan.au · Halal · Fresh · Local</p>
                </div>
            </div>
            """
        )
        sg.send(message)
        print(f"Merchant notification email sent to {merchant_email}")
    except Exception as e:
        print(f"Failed to send merchant email: {e}")
