import { useState } from 'react'
import { createCheckout } from './api'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

type CartItem = { id: number; name: string; price: number; emoji: string; qty: number }

interface CheckoutProps {
  cart: CartItem[]
  merchantId: number
  onClose: () => void
}

type Summary = {
  merchant_name: string
  merchant_suburb: string
  items: any[]
  subtotal: number
  gst_amount: number
  gst_note: string
  surcharge: number
  surcharge_label: string
  total: number
  payment_method: string
  payment_label: string
  instalment: number | null
  afterpay_available: boolean
}

export default function Checkout({ cart, merchantId, onClose }: CheckoutProps) {
  const [step, setStep] = useState<'details' | 'summary' | 'paying'>('details')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'afterpay'>('card')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0)

  const handleGetSummary = async () => {
    if (!name || !email) { setError('Please enter your name and email'); return }
    if (!email.includes('@')) { setError('Please enter a valid email'); return }
    setLoading(true)
    setError('')
    try {
      const res = await axios.post(`${API_URL}/payments/summary`, {
        merchant_id: merchantId,
        items: cart.map(i => ({ product_id: i.id, name: i.name, price: i.price, qty: i.qty, emoji: i.emoji })),
        payment_method: paymentMethod
      })
      setSummary(res.data)
      setStep('summary')
    } catch {
      setError('Could not load summary. Please try again.')
    }
    setLoading(false)
  }

  const handlePay = async () => {
    setStep('paying')
    setError('')
    try {
      const result = await createCheckout({
        merchant_id: merchantId,
        buyer_name: name,
        buyer_email: email,
        buyer_phone: phone,
        items: cart.map(i => ({ product_id: i.id, name: i.name, price: i.price, qty: i.qty, emoji: i.emoji })),
        payment_method: paymentMethod
      })
      window.location.href = result.checkout_url
    } catch {
      setError('Payment failed. Please try again.')
      setStep('summary')
    }
  }

  // ── STEP 1: BUYER DETAILS ─────────────────────────────
  if (step === 'details') {
    return (
      <div>
        <div className="sheet-handle" />
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4, color: 'var(--green-dark)' }}>Complete Your Order</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 20 }}>Enter your details to continue</div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Your Name *</label>
          <input type="text" placeholder="Full name" value={name} onChange={e => setName(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 10, fontSize: 16 }} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Email Address *</label>
          <input type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 10, fontSize: 16 }} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Phone (optional)</label>
          <input type="tel" placeholder="04XX XXX XXX" value={phone} onChange={e => setPhone(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 10, fontSize: 16 }} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 8 }}>Payment Method</label>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setPaymentMethod('card')}
              style={{ flex: 1, padding: '10px', borderRadius: 10, border: `2px solid ${paymentMethod === 'card' ? 'var(--green)' : 'var(--border)'}`,
                background: paymentMethod === 'card' ? 'var(--cream-dark)' : 'white', fontWeight: 700, fontSize: 13, color: 'var(--green-dark)' }}>
              💳 Card
            </button>
            {total >= 50 && (
              <button onClick={() => setPaymentMethod('afterpay')}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: `2px solid ${paymentMethod === 'afterpay' ? 'var(--green)' : 'var(--border)'}`,
                  background: paymentMethod === 'afterpay' ? 'var(--cream-dark)' : 'white', fontWeight: 700, fontSize: 13, color: 'var(--green-dark)' }}>
                🟢 Afterpay
              </button>
            )}
          </div>
          {paymentMethod === 'afterpay' && (
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>Pay in 4 fortnightly instalments · 6% surcharge applies</div>
          )}
          {paymentMethod === 'card' && (
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>1.7% + $0.30 card processing fee applies</div>
          )}
        </div>

        {error && (
          <div style={{ background: '#fce4ec', color: 'var(--red)', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 12 }}>{error}</div>
        )}

        <button className="btn-primary" onClick={handleGetSummary} disabled={loading}
          style={{ opacity: loading ? 0.7 : 1 }}>
          {loading ? '⏳ Loading summary...' : 'Review Order →'}
        </button>

        <button onClick={onClose} style={{ width: '100%', marginTop: 10, padding: 12, background: 'none', color: 'var(--text-3)', fontSize: 13, border: 'none' }}>
          ← Back to cart
        </button>
      </div>
    )
  }

  // ── STEP 2: ORDER SUMMARY DIALOG ─────────────────────
  if (step === 'summary' && summary) {
    return (
      <div>
        <div className="sheet-handle" />
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4, color: 'var(--green-dark)' }}>Order Summary</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 16 }}>
          {summary.merchant_name} · {summary.merchant_suburb}
        </div>

        {/* Items */}
        <div style={{ background: 'var(--cream-dark)', borderRadius: 12, padding: '12px 14px', marginBottom: 12 }}>
          {summary.items.map((item: any, i: number) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{item.emoji} {item.name} × {item.qty}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--green-dark)' }}>${item.total.toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Breakdown */}
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Subtotal</span>
            <span style={{ fontSize: 13, color: 'var(--green-dark)' }}>${summary.subtotal.toFixed(2)}</span>
          </div>

          {summary.gst_amount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>GST (included)</span>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>${summary.gst_amount.toFixed(2)}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 12, color: '#e65100' }}>{summary.surcharge_label}</span>
            <span style={{ fontSize: 12, color: '#e65100' }}>+${summary.surcharge.toFixed(2)}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>Total</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--red)' }}>${summary.total.toFixed(2)} AUD</span>
          </div>

          {summary.instalment && (
            <div style={{ marginTop: 8, background: '#e8f5e9', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
              <span style={{ fontSize: 12, color: '#2e7d32', fontWeight: 700 }}>
                🟢 4 × ${summary.instalment.toFixed(2)} fortnightly with Afterpay
              </span>
            </div>
          )}
        </div>

        {/* GST note */}
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 16, textAlign: 'center' }}>
          {summary.gst_note} · Surcharge disclosed as required by RBA
        </div>

        {/* Paying as */}
        <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 16, background: 'var(--cream-dark)', padding: '10px 14px', borderRadius: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 2 }}>Paying as</div>
          <div>{name} · {email}</div>
          {phone && <div>{phone}</div>}
        </div>

        {error && (
          <div style={{ background: '#fce4ec', color: 'var(--red)', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 12 }}>{error}</div>
        )}

        <button className="btn-primary" onClick={handlePay}>
          {paymentMethod === 'afterpay' ? '🟢 Pay with Afterpay' : `💳 Pay $${summary.total.toFixed(2)} AUD`}
        </button>

        <button onClick={() => setStep('details')}
          style={{ width: '100%', marginTop: 10, padding: 12, background: 'none', color: 'var(--text-3)', fontSize: 13, border: 'none' }}>
          ← Edit details
        </button>

        <div style={{ textAlign: 'center', marginTop: 12, fontSize: 11, color: 'var(--text-3)' }}>
          🔒 Secured by Stripe · Card details never stored on Apni Dukaan
        </div>
      </div>
    )
  }

  // ── STEP 3: PAYING ────────────────────────────────────
  return (
    <div style={{ textAlign: 'center', padding: '40px 16px' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
      <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--green-dark)', marginBottom: 8 }}>
        Redirecting to secure payment...
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
        Please do not close this page
      </div>
    </div>
  )
}
