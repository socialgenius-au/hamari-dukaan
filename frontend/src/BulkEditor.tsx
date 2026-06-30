import { useState } from 'react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

type Product = {
  id: number
  merchant_id: number
  merchant_name: string
  name: string
  emoji: string
  category: string | null
  price: number
  stock_qty: number
  is_active: boolean
}

type Edit = { price?: number; stock_qty?: number; is_active?: boolean }

export default function BulkEditor() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authErr, setAuthErr] = useState('')

  const [products, setProducts] = useState<Product[]>([])
  const [edits, setEdits] = useState<Record<number, Edit>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const [merchantFilter, setMerchantFilter] = useState('All')
  const [search, setSearch] = useState('')

  const headers = { 'x-admin-password': password }

  const load = async (pwd: string) => {
    setLoading(true)
    try {
      const res = await axios.get(`${API_URL}/staff/bulk/products`, { headers: { 'x-admin-password': pwd } })
      setProducts(res.data)
      setEdits({})
      setAuthed(true)
      setAuthErr('')
    } catch (e: any) {
      if (e?.response?.status === 401) setAuthErr('Invalid password')
      else setAuthErr('Failed to connect')
    }
    setLoading(false)
  }

  const merchants = ['All', ...Array.from(new Set(products.map(p => p.merchant_name))).sort()]

  const visible = products.filter(p => {
    if (merchantFilter !== 'All' && p.merchant_name !== merchantFilter) return false
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const setEdit = (id: number, field: keyof Edit, value: any) => {
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }))
  }

  const get = (p: Product, field: keyof Edit) => {
    const e = edits[p.id]
    if (e && field in e) return e[field as keyof typeof e]
    return p[field as keyof Product]
  }

  const dirtyCount = Object.keys(edits).length

  const saveAll = async () => {
    if (!dirtyCount) return
    setSaving(true)
    setMsg('')
    try {
      const updates = Object.entries(edits).map(([id, e]) => ({ id: Number(id), ...e }))
      await axios.patch(`${API_URL}/staff/bulk/products`, { updates }, { headers })
      await load(password)
      setMsg(`Saved ${updates.length} product${updates.length !== 1 ? 's' : ''}`)
    } catch {
      setMsg('Save failed — check console')
    }
    setSaving(false)
  }

  const toggleActive = (p: Product) => {
    const current = get(p, 'is_active') as boolean
    setEdit(p.id, 'is_active', !current)
  }

  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f5f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: 'white', borderRadius: 16, padding: '40px 32px', width: 320, boxShadow: '0 4px 24px rgba(0,0,0,0.10)' }}>
          <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 8 }}>⚡</div>
          <div style={{ fontSize: 20, fontWeight: 700, textAlign: 'center', marginBottom: 4, color: '#1a4a30' }}>Staff Bulk Editor</div>
          <div style={{ fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 24 }}>Enter admin password to continue</div>
          <input
            type="password"
            placeholder="Admin password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load(password)}
            style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #ddd', borderRadius: 10, fontSize: 15, boxSizing: 'border-box', marginBottom: 12 }}
          />
          {authErr && <div style={{ color: '#d32f2f', fontSize: 13, marginBottom: 10 }}>{authErr}</div>}
          <button
            onClick={() => load(password)}
            disabled={loading}
            style={{ width: '100%', background: '#276040', color: 'white', border: 'none', borderRadius: 10, padding: '12px 0', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
          >
            {loading ? 'Connecting…' : 'Login'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f0' }}>
      {/* Header */}
      <div style={{ background: '#1a4a30', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => window.location.href = '/admin'} style={{ background: 'none', color: 'white', border: 'none', fontSize: 20, cursor: 'pointer', padding: 0 }}>←</button>
        <div style={{ color: 'white', fontWeight: 700, fontSize: 16, flex: 1 }}>Staff Bulk Editor</div>
        {dirtyCount > 0 && (
          <span style={{ background: '#e8a020', color: 'white', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>
            {dirtyCount} unsaved
          </span>
        )}
        <button
          onClick={saveAll}
          disabled={saving || dirtyCount === 0}
          style={{ background: dirtyCount > 0 ? '#e8a020' : '#3a6a50', color: 'white', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 700, fontSize: 13, cursor: dirtyCount > 0 ? 'pointer' : 'default' }}
        >
          {saving ? 'Saving…' : `Save All${dirtyCount > 0 ? ` (${dirtyCount})` : ''}`}
        </button>
      </div>

      {/* Filters */}
      <div style={{ padding: '16px 20px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          placeholder="Search products…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: '8px 14px', border: '1.5px solid #ddd', borderRadius: 10, fontSize: 14, minWidth: 200 }}
        />
        <select
          value={merchantFilter}
          onChange={e => setMerchantFilter(e.target.value)}
          style={{ padding: '8px 14px', border: '1.5px solid #ddd', borderRadius: 10, fontSize: 14, background: 'white' }}
        >
          {merchants.map(m => <option key={m}>{m}</option>)}
        </select>
        <span style={{ fontSize: 13, color: '#666' }}>{visible.length} products</span>
        {msg && <span style={{ fontSize: 13, color: msg.includes('failed') ? '#d32f2f' : '#276040', fontWeight: 600 }}>{msg}</span>}
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', padding: '0 20px 40px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <thead>
            <tr style={{ background: '#1a4a30', color: 'white' }}>
              <th style={th}>Merchant</th>
              <th style={th}>Product</th>
              <th style={th}>Category</th>
              <th style={{ ...th, textAlign: 'right' }}>Price ($)</th>
              <th style={{ ...th, textAlign: 'right' }}>Stock</th>
              <th style={{ ...th, textAlign: 'center' }}>Active</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((p, i) => {
              const dirty = !!edits[p.id]
              const active = get(p, 'is_active') as boolean
              return (
                <tr key={p.id} style={{ background: dirty ? '#fffde7' : i % 2 === 0 ? 'white' : '#fafafa', borderBottom: '1px solid #eee' }}>
                  <td style={td}>
                    <span style={{ fontSize: 12, color: '#555' }}>{p.merchant_name}</span>
                  </td>
                  <td style={td}>
                    <span style={{ marginRight: 6 }}>{p.emoji}</span>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</span>
                  </td>
                  <td style={td}>
                    <span style={{ fontSize: 12, color: '#777' }}>{p.category || '—'}</span>
                  </td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={get(p, 'price') as number}
                      onChange={e => setEdit(p.id, 'price', parseFloat(e.target.value) || 0)}
                      style={{ width: 80, padding: '4px 8px', border: '1.5px solid #ddd', borderRadius: 6, fontSize: 14, textAlign: 'right' }}
                    />
                  </td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={get(p, 'stock_qty') as number}
                      onChange={e => setEdit(p.id, 'stock_qty', parseInt(e.target.value) || 0)}
                      style={{ width: 70, padding: '4px 8px', border: '1.5px solid #ddd', borderRadius: 6, fontSize: 14, textAlign: 'right' }}
                    />
                  </td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    <button
                      onClick={() => toggleActive(p)}
                      style={{
                        background: active ? '#276040' : '#ccc',
                        color: 'white',
                        border: 'none',
                        borderRadius: 20,
                        padding: '4px 14px',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        minWidth: 60,
                      }}
                    >
                      {active ? 'On' : 'Off'}
                    </button>
                  </td>
                </tr>
              )
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px 0', color: '#aaa' }}>No products found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const th: React.CSSProperties = { padding: '12px 16px', fontWeight: 700, fontSize: 13, textAlign: 'left' }
const td: React.CSSProperties = { padding: '10px 16px', fontSize: 14, verticalAlign: 'middle' }
