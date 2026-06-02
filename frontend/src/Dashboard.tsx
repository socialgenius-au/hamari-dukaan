import { useState, useEffect } from 'react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

type Order = {
  id: number
  buyer_name: string
  buyer_email: string
  buyer_phone: string
  items: any[]
  subtotal: number
  surcharge: number
  total: number
  commission: number
  merchant_payout: number
  payment_method: string
  status: string
  created_at: string
}

export default function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'orders' | 'stats'>('orders')
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  const token = localStorage.getItem('merchant_token')
  const merchantId = localStorage.getItem('merchant_id')
  const merchantName = localStorage.getItem('merchant_name')

  useEffect(() => {
    if (!token || !merchantId) {
      window.location.href = '/merchant'
      return
    }
    fetchOrders()
    // Fetch merchant profile with bank details
    axios.get(`${API_URL}/auth/merchant-profile?token=${token}`)
      .then(res => setProfile(res.data))
      .catch(() => {})
    const interval = setInterval(fetchOrders, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${API_URL}/orders/merchant/${merchantId}`)
      setOrders(res.data)
    } catch {
      window.location.href = '/merchant'
    }
    setLoading(false)
  }

  const updateStatus = async (orderId: number, status: string) => {
    setUpdatingId(orderId)
    try {
      await axios.patch(`${API_URL}/orders/${orderId}/status?status=${status}`)
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
    } catch { }
    setUpdatingId(null)
  }

  const resetOrders = async () => {
    if (!window.confirm("Reset all demo orders? This cannot be undone.")) return
    try {
      await axios.delete(`${API_URL}/orders/merchant/${merchantId}/reset`)
      setOrders([])
      alert("Orders reset! Ready for next demo.")
    } catch { alert("Reset failed") }
  }

  const logout = () => {
    localStorage.removeItem('merchant_token')
    localStorage.removeItem('merchant_id')
    localStorage.removeItem('merchant_name')
    window.location.href = '/merchant'
  }

  const todayOrders = orders.filter(o => {
    const today = new Date().toDateString()
    return new Date(o.created_at).toDateString() === today
  })

  const todayRevenue = todayOrders.reduce((sum, o) => sum + o.merchant_payout, 0)
  const totalRevenue = orders.reduce((sum, o) => sum + o.merchant_payout, 0)
  const pendingOrders = orders.filter(o => o.status === 'paid').length

  const statusColor = (status: string) => {
    if (status === 'paid') return { bg: '#fff3e0', color: '#e65100', label: 'New Order' }
    if (status === 'ready') return { bg: '#e3f2fd', color: '#1565c0', label: 'Ready' }
    if (status === 'fulfilled') return { bg: '#e8f5e9', color: '#2e7d32', label: 'Collected' }
    return { bg: 'var(--cream-dark)', color: 'var(--text-3)', label: status }
  }

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      {/* Header */}
      <div style={{ background: 'var(--green-dark)', padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>{merchantName}</div>
          <button onClick={logout} style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Logout
          </button>
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Merchant Dashboard · Apni Dukaan</div>
      </div>

      {/* Stats bar */}
      <div style={{ background: 'var(--green)', padding: '14px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--gold)' }}>${todayRevenue.toFixed(0)}</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>Today's payout</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--gold)' }}>{pendingOrders}</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>New orders</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--gold)' }}>${totalRevenue.toFixed(0)}</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>Total payout</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: 'white', borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => setActiveTab('orders')}
          style={{ flex: 1, padding: '12px', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            background: 'transparent', color: activeTab === 'orders' ? 'var(--green)' : 'var(--text-3)',
            borderBottom: activeTab === 'orders' ? '3px solid var(--green)' : '3px solid transparent' }}>
          📦 Orders {pendingOrders > 0 && `(${pendingOrders} new)`}
        </button>
        <button onClick={() => setActiveTab('stats')}
          style={{ flex: 1, padding: '12px', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            background: 'transparent', color: activeTab === 'stats' ? 'var(--green)' : 'var(--text-3)',
            borderBottom: activeTab === 'stats' ? '3px solid var(--green)' : '3px solid transparent' }}>
          📊 Stats
        </button>
      </div>

      <div style={{ padding: '16px' }}>

        {/* ORDERS TAB */}
        {activeTab === 'orders' && (
          <div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-3)' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
                <div>Loading orders...</div>
              </div>
            ) : orders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-3)' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>No orders yet</div>
                <div style={{ fontSize: 13 }}>Orders will appear here as buyers purchase from your store</div>
              </div>
            ) : (
              orders.map(order => {
                const s = statusColor(order.status)
                return (
                  <div key={order.id} style={{ background: 'white', borderRadius: 16, padding: '14px', marginBottom: 12, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--green-dark)' }}>#{order.id} · {order.buyer_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{order.buyer_email} · {timeAgo(order.created_at)}</div>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, background: s.bg, color: s.color, padding: '3px 8px', borderRadius: 6 }}>{s.label}</span>
                    </div>

                    <div style={{ background: 'var(--cream-dark)', borderRadius: 10, padding: '10px 12px', marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-2)' }}>Order total</span>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>${order.total?.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-2)' }}>Platform commission</span>
                        <span style={{ fontSize: 12, color: 'var(--red)' }}>-${order.commission?.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>Your payout</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#2e7d32' }}>${order.merchant_payout?.toFixed(2)}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      {order.status === 'paid' && (
                        <button onClick={() => updateStatus(order.id, 'ready')} disabled={updatingId === order.id}
                          style={{ flex: 1, padding: '10px', background: 'var(--green)', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                          {updatingId === order.id ? '⏳' : '✓ Mark Ready'}
                        </button>
                      )}
                      {order.status === 'ready' && (
                        <button onClick={() => updateStatus(order.id, 'fulfilled')} disabled={updatingId === order.id}
                          style={{ flex: 1, padding: '10px', background: '#2e7d32', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                          {updatingId === order.id ? '⏳' : '✓ Mark Collected'}
                        </button>
                      )}
                      {order.buyer_phone && (
                        <a href={`tel:${order.buyer_phone}`}
                          style={{ padding: '10px 14px', background: 'var(--cream-dark)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 13, color: 'var(--green-dark)', fontWeight: 600, textDecoration: 'none' }}>
                          📞
                        </a>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* STATS TAB */}
        {activeTab === 'stats' && (
          <div>
            <div style={{ background: 'white', borderRadius: 16, padding: '16px', marginBottom: 12, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', marginBottom: 12, textTransform: 'uppercase' }}>Revenue Summary</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Today's orders</span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{todayOrders.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Today's payout</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#2e7d32' }}>${todayRevenue.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Total orders</span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{orders.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Total payout</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#2e7d32' }}>${totalRevenue.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Commission paid</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)' }}>
                  ${orders.reduce((sum, o) => sum + (o.commission || 0), 0).toFixed(2)}
                </span>
              </div>
            </div>

            <div style={{ background: 'white', borderRadius: 16, padding: '16px', marginBottom: 12, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', marginBottom: 12, textTransform: 'uppercase' }}>Quick Actions</div>
              <button onClick={resetOrders}
                style={{ width: "100%", padding: "12px", background: "#fce4ec", border: "1px solid #ef9a9a", borderRadius: 10, fontWeight: 700, fontSize: 13, color: "#c62828", cursor: "pointer", marginBottom: 10, textAlign: "left" }}>
                🔄 Reset Demo Orders
              </button>
              <button onClick={() => window.location.href = "/settings"}
                style={{ width: "100%", padding: "12px", background: "var(--cream-dark)", border: "1px solid var(--border)", borderRadius: 10, fontWeight: 700, fontSize: 13, color: "var(--green-dark)", cursor: "pointer", marginBottom: 10, textAlign: "left" }}>
                ⚙️ Store Settings & ABN
              </button>
              <button onClick={() => window.location.href = "/import"}
                style={{ width: '100%', padding: '12px', background: 'var(--cream-dark)', border: '1px solid var(--border)', borderRadius: 10, fontWeight: 700, fontSize: 13, color: 'var(--green-dark)', cursor: 'pointer', marginBottom: 10, textAlign: 'left' }}>
                📦 Import Products (CSV / Barcode)
              </button>
              <button onClick={() => window.location.href = '/'}
                style={{ width: '100%', padding: '12px', background: 'var(--cream-dark)', border: '1px solid var(--border)', borderRadius: 10, fontWeight: 700, fontSize: 13, color: 'var(--green-dark)', cursor: 'pointer', textAlign: 'left' }}>
                🛍️ View Your Store
              </button>
            </div>

            {profile && (
              <div style={{ background: 'white', borderRadius: 16, padding: '16px', marginBottom: 12, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', marginBottom: 12, textTransform: 'uppercase' }}>Payout Details</div>
                {profile.bank_account ? (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Account name</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{profile.bank_account_name || '-'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, color: 'var(--text-2)' }}>BSB</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{profile.bank_bsb || '-'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Account number</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{profile.bank_account}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Payout method</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>
                        {profile.payment_preference === 'direct' ? '🏦 Direct Stripe' : '📋 Weekly bank transfer'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Bank details not set yet. Contact Apni Dukaan to add your bank account.</div>
                )}
              </div>
            )}
            <div style={{ background: 'var(--green-dark)', borderRadius: 16, padding: '16px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 8 }}>Commission Tier</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
                Current rate: <span style={{ color: 'var(--gold)', fontWeight: 700 }}>10%</span> (up to $4,000/month GMV){'\n'}
                Above $4,000: <span style={{ color: 'var(--gold)', fontWeight: 700 }}>8%</span> flat
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
