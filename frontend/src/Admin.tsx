import { useState } from "react"
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

export default function Admin() {
  const [password, setPassword] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'merchants' | 'orders'>('overview')
  const [selectedMerchant, setSelectedMerchant] = useState<any>(null)
  const [editData, setEditData] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const headers = { 'x-admin-password': password }

  const fetchData = async (pwd: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await axios.get(`${API_URL}/admin/dashboard`, { headers: { 'x-admin-password': pwd } })
      setData(res.data)
      setLoggedIn(true)
    } catch {
      setError('Invalid password')
    }
    setLoading(false)
  }

  const handleLogin = () => fetchData(password)

  const handleSaveMerchant = async () => {
    setSaving(true)
    try {
      await axios.patch(`${API_URL}/admin/merchants/${selectedMerchant.id}`, editData, { headers })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      fetchData(password)
    } catch {
      alert('Failed to save')
    }
    setSaving(false)
  }

  if (!loggedIn) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ background: 'var(--green-dark)', borderRadius: 16, padding: '24px', textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'white' }}>Apni Dukaan</div>
            <div style={{ fontSize: 14, color: 'var(--gold)', marginTop: 4 }}>Admin Panel</div>
          </div>
          <div style={{ background: 'white', borderRadius: 16, padding: 20, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 8 }}>Admin Password</div>
            <input type="password" placeholder="Enter admin password" value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{ width: '100%', padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 10, fontSize: 16, marginBottom: 12 }} />
            {error && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{error}</div>}
            <button className="btn-primary" onClick={handleLogin} disabled={loading}>
              {loading ? '⏳ Logging in...' : 'Login →'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      {/* Header */}
      <div style={{ background: 'var(--green-dark)', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>Apni Dukaan — Admin</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Platform command centre</div>
        </div>
        <button onClick={() => setLoggedIn(false)}
          style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, cursor: 'pointer' }}>
          Logout
        </button>
      </div>

      {/* Stats bar */}
      {data && (
        <div style={{ background: 'var(--green)', padding: '16px 24px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {[
            { label: 'Total Merchants', value: data.total_merchants },
            { label: 'Total Orders', value: data.total_orders },
            { label: 'Total Revenue', value: `$${data.total_revenue?.toFixed(2)}` },
            { label: 'Your Commission', value: `$${data.total_commission?.toFixed(2)}` },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--gold)' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ background: 'white', borderBottom: '1px solid var(--border)', display: 'flex', padding: '0 24px' }}>
        {[['overview', '📊 Overview'], ['merchants', '🏪 Merchants'], ['orders', '📦 Orders']].map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab as any)}
            style={{ padding: '14px 20px', border: 'none', background: 'transparent', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              color: activeTab === tab ? 'var(--green)' : 'var(--text-3)',
              borderBottom: activeTab === tab ? '3px solid var(--green)' : '3px solid transparent' }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>

        {/* OVERVIEW */}
        {activeTab === 'overview' && data && (
          <div>
            <h2 style={{ color: 'var(--green-dark)', marginBottom: 16 }}>Recent Orders</h2>
            <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--green)', color: 'white' }}>
                    {['#', 'Buyer', 'Merchant', 'Total', 'Commission', 'Payout', 'Method', 'Promo', 'Status', 'Time'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.recent_orders.map((o: any, i: number) => {
                    const merchant = data.merchants.find((m: any) => m.id === o.merchant_id)
                    return (
                      <tr key={o.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                        <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700 }}>#{o.id}</td>
                        <td style={{ padding: '10px 12px', fontSize: 13 }}>{o.buyer_name}<br/><span style={{ fontSize: 11, color: 'var(--text-3)' }}>{o.buyer_email}</span></td>
                        <td style={{ padding: '10px 12px', fontSize: 13 }}>{merchant?.name || `#${o.merchant_id}`}</td>
                        <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700 }}>${o.total?.toFixed(2)}</td>
                        <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--green)' }}>${o.commission?.toFixed(2)}</td>
                        <td style={{ padding: '10px 12px', fontSize: 13 }}>${o.merchant_payout?.toFixed(2)}</td>
                        <td style={{ padding: '10px 12px', fontSize: 12 }}>{o.payment_method}</td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--green)', fontWeight: 700 }}>{o.promo_code || '-'}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                            background: o.status === 'paid' ? '#fff3e0' : o.status === 'fulfilled' ? '#e8f5e9' : '#e3f2fd',
                            color: o.status === 'paid' ? '#e65100' : o.status === 'fulfilled' ? '#2e7d32' : '#1565c0' }}>
                            {o.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: 11, color: 'var(--text-3)' }}>
                          {new Date(o.created_at).toLocaleDateString('en-AU')}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MERCHANTS */}
        {activeTab === 'merchants' && data && (
          <div style={{ display: 'grid', gridTemplateColumns: selectedMerchant ? '1fr 1fr' : '1fr', gap: 24 }}>
            <div>
              <h2 style={{ color: 'var(--green-dark)', marginBottom: 16 }}>All Merchants</h2>
              {data.merchants.map((m: any) => (
                <div key={m.id} onClick={() => { setSelectedMerchant(m); setEditData({ payment_preference: m.payment_preference || 'platform', bank_bsb: m.bank_bsb || '', bank_account: m.bank_account || '', bank_account_name: m.bank_account_name || '', notes: m.notes || '', is_active: m.is_active }) }}
                  style={{ background: 'white', borderRadius: 16, padding: 16, marginBottom: 12, border: `2px solid ${selectedMerchant?.id === m.id ? 'var(--green)' : 'var(--border)'}`, cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--green-dark)' }}>{m.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{m.suburb} · {m.category} · ID: {m.id}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, fontWeight: 700,
                        background: m.is_active ? '#e8f5e9' : '#fce4ec', color: m.is_active ? '#2e7d32' : 'var(--red)' }}>
                        {m.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, fontWeight: 700,
                        background: m.payment_preference === 'direct' ? '#e3f2fd' : '#fff3e0',
                        color: m.payment_preference === 'direct' ? '#1565c0' : '#e65100' }}>
                        {m.payment_preference === 'direct' ? 'Direct' : 'Platform'}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    <div style={{ background: 'var(--cream-dark)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--green)' }}>{m.total_orders}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-3)' }}>Orders</div>
                    </div>
                    <div style={{ background: 'var(--cream-dark)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--green)' }}>${m.total_revenue?.toFixed(0)}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-3)' }}>Revenue</div>
                    </div>
                    <div style={{ background: 'var(--cream-dark)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#2e7d32' }}>${m.total_payout?.toFixed(0)}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-3)' }}>Their payout</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Merchant Edit Panel */}
            {selectedMerchant && (
              <div>
                <h2 style={{ color: 'var(--green-dark)', marginBottom: 16 }}>Edit — {selectedMerchant.name}</h2>
                <div style={{ background: 'white', borderRadius: 16, padding: 20, border: '1px solid var(--border)', marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', marginBottom: 16, textTransform: 'uppercase' }}>Payment Settings</div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Payment Preference</label>
                    <select value={editData.payment_preference} onChange={e => setEditData({...editData, payment_preference: e.target.value})}
                      style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 10, fontSize: 14, background: 'white' }}>
                      <option value="platform">📋 Platform Managed (weekly bank transfer)</option>
                      <option value="direct">🏦 Direct Stripe Payout</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Account Name</label>
                    <input value={editData.bank_account_name} onChange={e => setEditData({...editData, bank_account_name: e.target.value})}
                      placeholder="e.g. King Spice Pty Ltd"
                      style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 10, fontSize: 14 }} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>BSB</label>
                      <input value={editData.bank_bsb} onChange={e => setEditData({...editData, bank_bsb: e.target.value})}
                        placeholder="062-000"
                        style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 10, fontSize: 14 }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Account Number</label>
                      <input value={editData.bank_account} onChange={e => setEditData({...editData, bank_account: e.target.value})}
                        placeholder="12345678"
                        style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 10, fontSize: 16 }} />
                    </div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Internal Notes</label>
                    <textarea value={editData.notes} onChange={e => setEditData({...editData, notes: e.target.value})}
                      placeholder="Notes about this merchant..." rows={2}
                      style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 10, fontSize: 14, resize: 'none' }} />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--cream-dark)', borderRadius: 10, marginBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Account Active</div>
                    <button onClick={() => setEditData({...editData, is_active: !editData.is_active})}
                      style={{ width: 48, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer',
                        background: editData.is_active ? 'var(--green)' : '#ccc', position: 'relative' }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'white',
                        position: 'absolute', top: 3, left: editData.is_active ? 23 : 3 }} />
                    </button>
                  </div>

                  {saved && <div style={{ background: '#e8f5e9', color: '#2e7d32', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 12, fontWeight: 700 }}>✅ Saved!</div>}

                  <button className="btn-primary" onClick={handleSaveMerchant} disabled={saving}>
                    {saving ? '⏳ Saving...' : 'Save Changes'}
                  </button>
                </div>

                <div style={{ background: 'white', borderRadius: 16, padding: 20, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', marginBottom: 12, textTransform: 'uppercase' }}>Merchant Details</div>
                  {[
                    ['Email', selectedMerchant.email],
                    ['Phone', selectedMerchant.phone],
                    ['ABN', selectedMerchant.abn || 'Not provided'],
                    ['GST', selectedMerchant.gst_registered ? 'Registered' : 'Not registered'],
                  ].map(([label, value]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{label}</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{value || '-'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ORDERS */}
        {activeTab === 'orders' && data && (
          <div>
            <h2 style={{ color: 'var(--green-dark)', marginBottom: 16 }}>All Orders ({data.total_orders})</h2>
            <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--green)', color: 'white' }}>
                    {['#', 'Buyer', 'Email', 'Merchant', 'Total', 'Commission', 'Payout', 'Promo', 'Status', 'Date'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.recent_orders.map((o: any, i: number) => {
                    const merchant = data.merchants.find((m: any) => m.id === o.merchant_id)
                    return (
                      <tr key={o.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                        <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700 }}>#{o.id}</td>
                        <td style={{ padding: '10px 12px', fontSize: 13 }}>{o.buyer_name}</td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-3)' }}>{o.buyer_email}</td>
                        <td style={{ padding: '10px 12px', fontSize: 13 }}>{merchant?.name || `#${o.merchant_id}`}</td>
                        <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700 }}>${o.total?.toFixed(2)}</td>
                        <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--green)', fontWeight: 700 }}>${o.commission?.toFixed(2)}</td>
                        <td style={{ padding: '10px 12px', fontSize: 13 }}>${o.merchant_payout?.toFixed(2)}</td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--green)', fontWeight: 700 }}>{o.promo_code || '-'}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                            background: o.status === 'paid' ? '#fff3e0' : o.status === 'fulfilled' ? '#e8f5e9' : '#e3f2fd',
                            color: o.status === 'paid' ? '#e65100' : o.status === 'fulfilled' ? '#2e7d32' : '#1565c0' }}>
                            {o.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: 11, color: 'var(--text-3)' }}>
                          {new Date(o.created_at).toLocaleDateString('en-AU')}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
