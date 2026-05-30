import { useState } from 'react'
import { createCheckout } from './api'

type CartItem = { id: number; name: string; price: number; emoji: string; qty: number }

interface CheckoutProps {
  cart: CartItem[]
  merchantId: number
  onClose: () => void
}

export default function Checkout({ cart, merchantId, onClose }: CheckoutProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0)
  // const commission = total * 0.10
  // // const merchantPayout = total - commission

  const handleCheckout = async () => {
    if (!name || !email) {
      setError('Please enter your name and email')
      return
    }
    if (!email.includes('@')) {
      setError('Please enter a valid email address')
      return
    }
    setLoading(true)
    setError('')
    try {
      const result = await createCheckout({
        merchant_id: merchantId,
        buyer_name: name,
        buyer_email: email,
        buyer_phone: phone,
        items: cart.map(i => ({
          product_id: i.id,
          name: i.name,
          price: i.price,
          qty: i.qty,
          emoji: i.emoji
        }))
      })
      window.location.href = result.checkout_url
    } catch (e: any) {
      setError('Payment setup failed. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="sheet-handle" />
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4, color: 'var(--green-dark)' }}>
        Complete Your Order
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 20 }}>
        You'll be redirected to Stripe's secure payment page
      </div>

      {/* Order summary */}
      <div style={{ background: 'var(--cream-dark)', borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', marginBottom: 8 }}>Order Summary</div>
        {cart.map(item => (
          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{item.emoji} {item.name} × {item.qty}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--green-dark)' }}>${(item.price * item.qty).toFixed(2)}</span>
          </div>
        ))}
        <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>Total</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--red)' }}>${total.toFixed(2)} AUD</span>
        </div>
      </div>

      {/* Buyer details */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Your Name *</label>
        <input
          type="text"
          placeholder="Full name"
          value={name}
          onChange={e => setName(e.target.value)}
          style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 10, fontSize: 16 }}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Email Address *</label>
        <input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 10, fontSize: 16 }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Phone Number (optional)</label>
        <input
          type="tel"
          placeholder="04XX XXX XXX"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 10, fontSize: 16 }}
        />
      </div>

      {error && (
        <div style={{ background: '#fce4ec', color: 'var(--red)', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 12 }}>
          {error}
        </div>
      )}

      <button
        className="btn-primary"
        onClick={handleCheckout}
        disabled={loading}
        style={{ opacity: loading ? 0.7 : 1 }}
      >
        {loading ? '⏳ Redirecting to payment...' : `💳 Pay $${total.toFixed(2)} AUD securely`}
      </button>

      <button
        onClick={onClose}
        style={{ width: '100%', marginTop: 10, padding: 12, background: 'none', color: 'var(--text-3)', fontSize: 13, border: 'none' }}
      >
        ← Back to cart
      </button>

      <div style={{ textAlign: 'center', marginTop: 12, fontSize: 11, color: 'var(--text-3)' }}>
        🔒 Secured by Stripe · Your card details are never stored
      </div>
    </div>
  )
}
