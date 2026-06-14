import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

// ─── Types ───────────────────────────────────────────────────────────────────

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

type ProductTask = {
  id: number
  name: string
  image_url: string | null
  description: string | null
  price: number | null
  category: string | null
  stock: number | null
  staff_note: string | null
  note_updated_by: string | null
  note_updated_at: string | null
  has_image: boolean
  has_description: boolean
  has_price: boolean
  has_category: boolean
  has_stock: boolean
  completed: number
  total: number
  is_live: boolean
}

type TaskSummary = {
  total: number
  live: number
  needs_image: number
  needs_description: number
  needs_price: number
  needs_category: number
  needs_stock: number
}

type Message = {
  id: number
  sender_type: 'staff' | 'merchant'
  sender_name: string
  body: string
  is_read: boolean
  created_at: string
}

type TabType = 'orders' | 'stats' | 'tasks' | 'messages'

// Detect if this is a staff session
// Staff login stores 'staff_name' in localStorage
// Merchant login stores 'merchant_token' + 'merchant_id'
const isStaff = () => !!localStorage.getItem('staff_name')
const staffName = () => localStorage.getItem('staff_name') || 'Staff'

// ─── Pill badge ───────────────────────────────────────────────────────────────

function Badge({ count, color = '#e65100' }: { count: number; color?: string }) {
  if (!count) return null
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: color, color: 'white', borderRadius: 99, fontSize: 10,
      fontWeight: 700, minWidth: 16, height: 16, padding: '0 4px', marginLeft: 4
    }}>{count}</span>
  )
}

// ─── Criteria pill ────────────────────────────────────────────────────────────

function CriteriaPill({ done, label }: { done: boolean; label: string }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 99,
      background: done ? '#e8f5e9' : '#fce4ec',
      color: done ? '#2e7d32' : '#c62828',
      border: `1px solid ${done ? '#a5d6a7' : '#ef9a9a'}`,
      display: 'inline-block', marginRight: 4, marginBottom: 4
    }}>{done ? '✓' : '✗'} {label}</span>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('orders')
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  // Tasks state
  const [tasks, setTasks] = useState<ProductTask[]>([])
  const [taskSummary, setTaskSummary] = useState<TaskSummary | null>(null)
  const [tasksLoading, setTasksLoading] = useState(false)
  const [taskFilter, setTaskFilter] = useState<'all' | 'incomplete' | 'live'>('incomplete')
  const [editingNote, setEditingNote] = useState<number | null>(null)
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  // Messages state
  const [messages, setMessages] = useState<Message[]>([])
  const [msgText, setMsgText] = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)
  const [msgsLoading, setMsgsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const token = localStorage.getItem('merchant_token')
  const merchantId = localStorage.getItem('merchant_id')
  const merchantName = localStorage.getItem('merchant_name')
  const staff = isStaff()

  useEffect(() => {
    if (!token || !merchantId) {
      window.location.href = '/merchant'
      return
    }
    fetchOrders()
    axios.get(`${API_URL}/auth/merchant-profile?token=${token}`)
      .then(res => setProfile(res.data))
      .catch(() => {})
    const interval = setInterval(fetchOrders, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (activeTab === 'tasks') fetchTasks()
    if (activeTab === 'messages') fetchMessages()
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'messages') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, activeTab])

  // ── Data fetchers ─────────────────────────────────────────────────────────

  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${API_URL}/orders/merchant/${merchantId}`)
      setOrders(res.data)
    } catch {
      window.location.href = '/merchant'
    }
    setLoading(false)
  }

  const fetchTasks = async () => {
    setTasksLoading(true)
    try {
      const res = await axios.get(`${API_URL}/tasks/merchant/${merchantId}/product-tasks`)
      setTasks(res.data.products)
      setTaskSummary(res.data.summary)
    } catch { }
    setTasksLoading(false)
  }

  const fetchMessages = async () => {
    setMsgsLoading(true)
    try {
      const res = await axios.get(`${API_URL}/tasks/merchant/${merchantId}/messages`)
      setMessages(res.data)
      // mark as read when staff opens
      if (staff) {
        axios.patch(`${API_URL}/tasks/merchant/${merchantId}/messages/read`).catch(() => {})
      }
    } catch { }
    setMsgsLoading(false)
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  const updateStatus = async (orderId: number, status: string) => {
    setUpdatingId(orderId)
    try {
      await axios.patch(`${API_URL}/orders/${orderId}/status?status=${status}`)
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
    } catch { }
    setUpdatingId(null)
  }

  const saveNote = async (productId: number) => {
    setSavingNote(true)
    try {
      await axios.patch(`${API_URL}/tasks/product/${productId}/staff-note`, {
        note: noteText,
        updated_by: staffName()
      })
      setTasks(prev => prev.map(p => p.id === productId
        ? { ...p, staff_note: noteText, note_updated_by: staffName(), note_updated_at: new Date().toISOString() }
        : p
      ))
      setEditingNote(null)
    } catch { }
    setSavingNote(false)
  }

  const sendMessage = async () => {
    if (!msgText.trim()) return
    setSendingMsg(true)
    const body = msgText.trim()
    setMsgText('')
    try {
      const res = await axios.post(`${API_URL}/tasks/merchant/${merchantId}/messages`, {
        merchant_id: Number(merchantId),
        sender_type: staff ? 'staff' : 'merchant',
        sender_name: staff ? staffName() : (merchantName || 'Merchant'),
        body
      })
      setMessages(prev => [...prev, {
        id: res.data.id,
        sender_type: staff ? 'staff' : 'merchant',
        sender_name: staff ? staffName() : (merchantName || 'Merchant'),
        body,
        is_read: false,
        created_at: res.data.created_at
      }])
    } catch { }
    setSendingMsg(false)
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
    localStorage.removeItem('staff_name')
    window.location.href = '/merchant'
  }

  // ── Computed values ───────────────────────────────────────────────────────

  const todayOrders = orders.filter(o =>
    new Date(o.created_at).toDateString() === new Date().toDateString()
  )
  const todayRevenue = todayOrders.reduce((sum, o) => sum + o.merchant_payout, 0)
  const totalRevenue = orders.reduce((sum, o) => sum + o.merchant_payout, 0)
  const pendingOrders = orders.filter(o => o.status === 'paid').length
  const unreadMessages = messages.filter(m => !m.is_read && m.sender_type !== (staff ? 'merchant' : 'staff')).length

  const filteredTasks = tasks.filter(p => {
    if (taskFilter === 'live') return p.is_live
    if (taskFilter === 'incomplete') return !p.is_live
    return true
  })

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

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    const today = new Date()
    if (d.toDateString() === today.toDateString()) return 'Today'
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', paddingBottom: 80 }}>

      {/* Header */}
      <div style={{ background: 'var(--green-dark)', padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>{merchantName}</div>
            {staff && <div style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 600 }}>Staff: {staffName()}</div>}
          </div>
          <button onClick={logout} style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Logout
          </button>
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
          {staff ? 'Staff Portal' : 'Merchant Dashboard'} · Hamari Dukaan
        </div>
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
      <div style={{ display: 'flex', background: 'white', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 10 }}>
        {(['orders', 'stats', 'tasks', 'messages'] as TabType[]).map(tab => {
          const labels: Record<TabType, string> = {
            orders: '📦 Orders',
            stats: '📊 Stats',
            tasks: '🗂️ Tasks',
            messages: '💬 Chat'
          }
          const badges: Record<TabType, number> = {
            orders: pendingOrders,
            stats: 0,
            tasks: taskSummary ? taskSummary.total - taskSummary.live : 0,
            messages: unreadMessages
          }
          // Staff sees all tabs; merchant sees orders + stats + messages only
          if (!staff && tab === 'tasks') return null
          return (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{
                flex: 1, padding: '11px 4px', border: 'none', fontWeight: 700, fontSize: 12,
                cursor: 'pointer', background: 'transparent',
                color: activeTab === tab ? 'var(--green)' : 'var(--text-3)',
                borderBottom: activeTab === tab ? '3px solid var(--green)' : '3px solid transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2
              }}>
              {labels[tab]}
              <Badge count={badges[tab]} color={tab === 'messages' ? '#276040' : '#e65100'} />
            </button>
          )
        })}
      </div>

      <div style={{ padding: '16px' }}>

        {/* ── ORDERS TAB ─────────────────────────────────────────────────── */}
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
                <div style={{ fontSize: 13 }}>Orders appear here as buyers purchase from your store</div>
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

        {/* ── TASKS TAB (staff only) ──────────────────────────────────────── */}
        {activeTab === 'tasks' && staff && (
          <div>
            {/* Progress card */}
            {taskSummary && (
              <div style={{ background: 'white', borderRadius: 16, padding: '16px', marginBottom: 12, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green-dark)' }}>
                    Catalogue Progress
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                    {taskSummary.live} / {taskSummary.total} live
                  </div>
                </div>
                {/* Progress bar */}
                <div style={{ background: '#e8f0e8', borderRadius: 99, height: 10, overflow: 'hidden', marginBottom: 12 }}>
                  <div style={{
                    height: '100%', borderRadius: 99, background: 'var(--green)',
                    width: `${taskSummary.total ? (taskSummary.live / taskSummary.total) * 100 : 0}%`,
                    transition: 'width 0.5s ease'
                  }} />
                </div>
                {/* What's missing breakdown */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {[
                    { key: 'needs_image', label: 'Missing image', emoji: '🖼️' },
                    { key: 'needs_description', label: 'No description', emoji: '📝' },
                    { key: 'needs_price', label: 'No price', emoji: '💰' },
                    { key: 'needs_category', label: 'No category', emoji: '🏷️' },
                    { key: 'needs_stock', label: 'No stock qty', emoji: '📦' },
                  ].map(({ key, label, emoji }) => {
                    const count = (taskSummary as any)[key]
                    return (
                      <div key={key} style={{
                        background: count > 0 ? '#fff3e0' : '#e8f5e9',
                        borderRadius: 10, padding: '8px 10px',
                        border: `1px solid ${count > 0 ? '#ffcc80' : '#a5d6a7'}`
                      }}>
                        <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 2 }}>{emoji} {label}</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: count > 0 ? '#e65100' : '#2e7d32' }}>{count}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Filter pills */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {(['incomplete', 'live', 'all'] as const).map(f => (
                <button key={f} onClick={() => setTaskFilter(f)}
                  style={{
                    padding: '6px 14px', borderRadius: 99, border: 'none', fontSize: 12, fontWeight: 700,
                    cursor: 'pointer',
                    background: taskFilter === f ? 'var(--green)' : 'white',
                    color: taskFilter === f ? 'white' : 'var(--text-2)',
                    border: `1px solid ${taskFilter === f ? 'var(--green)' : 'var(--border)'}`
                  } as any}>
                  {f === 'incomplete' ? '⚠️ Incomplete' : f === 'live' ? '✅ Live' : '📋 All'}
                  {f === 'incomplete' && taskSummary && (
                    <span style={{ marginLeft: 4 }}>({taskSummary.total - taskSummary.live})</span>
                  )}
                </button>
              ))}
            </div>

            {/* Refresh */}
            <button onClick={fetchTasks} style={{
              width: '100%', padding: '10px', background: 'var(--cream-dark)', border: '1px solid var(--border)',
              borderRadius: 10, fontSize: 12, fontWeight: 600, color: 'var(--green-dark)', cursor: 'pointer', marginBottom: 12
            }}>🔄 Refresh task list</button>

            {tasksLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)' }}>
                <div style={{ fontSize: 32 }}>⏳</div>
                <div style={{ marginTop: 8 }}>Loading products...</div>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)' }}>
                <div style={{ fontSize: 40 }}>{taskFilter === 'live' ? '✅' : '🎉'}</div>
                <div style={{ fontWeight: 700, marginTop: 8 }}>
                  {taskFilter === 'live' ? 'No live products yet' : 'All products complete!'}
                </div>
              </div>
            ) : (
              filteredTasks.map(product => (
                <div key={product.id} style={{
                  background: 'white', borderRadius: 16, padding: '14px', marginBottom: 10,
                  border: `1px solid ${product.is_live ? '#a5d6a7' : 'var(--border)'}`,
                  borderLeft: `4px solid ${product.is_live ? '#2e7d32' : product.completed >= 3 ? '#fb8c00' : '#e53935'}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green-dark)', flex: 1, paddingRight: 8 }}>
                      {product.name}
                    </div>
                    <div style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 99,
                      background: product.is_live ? '#e8f5e9' : '#fce4ec',
                      color: product.is_live ? '#2e7d32' : '#c62828',
                      whiteSpace: 'nowrap'
                    }}>
                      {product.is_live ? '✅ Live' : `${product.completed}/5`}
                    </div>
                  </div>

                  {/* Mini progress bar */}
                  <div style={{ background: '#f0f0f0', borderRadius: 99, height: 4, marginBottom: 8 }}>
                    <div style={{
                      height: '100%', borderRadius: 99,
                      background: product.is_live ? '#2e7d32' : product.completed >= 3 ? '#fb8c00' : '#e53935',
                      width: `${(product.completed / 5) * 100}%`
                    }} />
                  </div>

                  {/* Criteria pills */}
                  <div style={{ marginBottom: product.is_live ? 0 : 10 }}>
                    <CriteriaPill done={product.has_image} label="Image" />
                    <CriteriaPill done={product.has_description} label="Description" />
                    <CriteriaPill done={product.has_price} label="Price" />
                    <CriteriaPill done={product.has_category} label="Category" />
                    <CriteriaPill done={product.has_stock} label="Stock" />
                  </div>

                  {/* Staff note */}
                  {editingNote === product.id ? (
                    <div style={{ marginTop: 10 }}>
                      <textarea
                        value={noteText}
                        onChange={e => setNoteText(e.target.value)}
                        placeholder="Handover note — e.g. 'Waiting on photo from merchant, price confirmed $4.50'"
                        style={{
                          width: '100%', padding: '8px 10px', borderRadius: 8,
                          border: '1px solid var(--green)', fontSize: 12, resize: 'vertical',
                          minHeight: 60, boxSizing: 'border-box', fontFamily: 'inherit'
                        }}
                      />
                      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                        <button onClick={() => saveNote(product.id)} disabled={savingNote}
                          style={{ flex: 1, padding: '8px', background: 'var(--green)', color: 'white', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                          {savingNote ? '⏳' : '💾 Save note'}
                        </button>
                        <button onClick={() => setEditingNote(null)}
                          style={{ padding: '8px 14px', background: 'var(--cream-dark)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ marginTop: 8 }}>
                      {product.staff_note ? (
                        <div style={{ background: '#fffde7', border: '1px solid #fff176', borderRadius: 8, padding: '8px 10px', marginBottom: 6 }}>
                          <div style={{ fontSize: 11, color: '#f57f17', fontWeight: 600, marginBottom: 2 }}>
                            📌 {product.note_updated_by} · {product.note_updated_at ? timeAgo(product.note_updated_at) : ''}
                          </div>
                          <div style={{ fontSize: 12, color: '#5d4037', lineHeight: 1.4 }}>{product.staff_note}</div>
                        </div>
                      ) : null}
                      <button onClick={() => { setEditingNote(product.id); setNoteText(product.staff_note || '') }}
                        style={{
                          fontSize: 11, padding: '5px 10px', borderRadius: 8, border: '1px solid var(--border)',
                          background: 'var(--cream-dark)', color: 'var(--text-2)', cursor: 'pointer', fontWeight: 600
                        }}>
                        {product.staff_note ? '✏️ Edit note' : '📝 Add handover note'}
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ── STATS TAB ──────────────────────────────────────────────────── */}
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
              {staff && (
                <button onClick={resetOrders}
                  style={{ width: "100%", padding: "12px", background: "#fce4ec", border: "1px solid #ef9a9a", borderRadius: 10, fontWeight: 700, fontSize: 13, color: "#c62828", cursor: "pointer", marginBottom: 10, textAlign: "left" }}>
                  🔄 Reset Demo Orders
                </button>
              )}
              <button onClick={() => window.location.href = "/settings"}
                style={{ width: "100%", padding: "12px", background: "var(--cream-dark)", border: "1px solid var(--border)", borderRadius: 10, fontWeight: 700, fontSize: 13, color: "var(--green-dark)", cursor: "pointer", marginBottom: 10, textAlign: "left" }}>
                ⚙️ Store Settings & ABN
              </button>
              {staff && (
                <button onClick={() => window.location.href = "/import"}
                  style={{ width: '100%', padding: '12px', background: 'var(--cream-dark)', border: '1px solid var(--border)', borderRadius: 10, fontWeight: 700, fontSize: 13, color: 'var(--green-dark)', cursor: 'pointer', marginBottom: 10, textAlign: 'left' }}>
                  📦 Import Products (CSV / Barcode)
                </button>
              )}
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
                  <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Bank details not set. Contact Hamari Dukaan to add your bank account.</div>
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

        {/* ── MESSAGES TAB ───────────────────────────────────────────────── */}
        {activeTab === 'messages' && (
          <div>
            {/* Header context */}
            <div style={{
              background: 'white', borderRadius: 12, padding: '10px 14px', marginBottom: 12,
              border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10
            }}>
              <div style={{ fontSize: 28 }}>💬</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green-dark)' }}>
                  {staff ? `Chat with ${merchantName}` : 'Chat with Hamari Dukaan team'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                  {staff ? 'Request photos, confirm prices, get approvals' : 'Ask questions, send photos, get updates on your catalogue'}
                </div>
              </div>
            </div>

            {/* Message thread */}
            <div style={{
              background: 'white', borderRadius: 16, padding: '14px',
              border: '1px solid var(--border)', minHeight: 300, marginBottom: 12
            }}>
              {msgsLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)' }}>⏳ Loading...</div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)' }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>👋</div>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>No messages yet</div>
                  <div style={{ fontSize: 12 }}>
                    {staff
                      ? 'Start by asking the merchant for product photos or confirming prices'
                      : 'Our team will message you here when your catalogue is being set up'}
                  </div>
                </div>
              ) : (
                <div>
                  {messages.map((msg, idx) => {
                    const isMe = staff ? msg.sender_type === 'staff' : msg.sender_type === 'merchant'
                    const prevMsg = messages[idx - 1]
                    const showDate = !prevMsg ||
                      new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString()

                    return (
                      <div key={msg.id}>
                        {showDate && (
                          <div style={{ textAlign: 'center', margin: '10px 0', fontSize: 11, color: 'var(--text-3)' }}>
                            — {formatDate(msg.created_at)} —
                          </div>
                        )}
                        <div style={{
                          display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row',
                          alignItems: 'flex-end', gap: 8, marginBottom: 10
                        }}>
                          {/* Avatar */}
                          <div style={{
                            width: 28, height: 28, borderRadius: 99, flexShrink: 0,
                            background: msg.sender_type === 'staff' ? 'var(--green)' : 'var(--gold)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 12, color: 'white', fontWeight: 700
                          }}>
                            {msg.sender_name.charAt(0).toUpperCase()}
                          </div>
                          {/* Bubble */}
                          <div style={{ maxWidth: '75%' }}>
                            {!isMe && (
                              <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 3, fontWeight: 600 }}>
                                {msg.sender_name}
                              </div>
                            )}
                            <div style={{
                              padding: '9px 13px', borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                              background: isMe ? 'var(--green)' : '#f0f0f0',
                              color: isMe ? 'white' : 'var(--text-1)',
                              fontSize: 13, lineHeight: 1.5
                            }}>
                              {msg.body}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 3, textAlign: isMe ? 'right' : 'left' }}>
                              {formatTime(msg.created_at)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Message input */}
            <div style={{
              position: 'fixed', bottom: 0, left: 0, right: 0,
              background: 'white', borderTop: '1px solid var(--border)',
              padding: '10px 16px', display: 'flex', gap: 8
            }}>
              <input
                value={msgText}
                onChange={e => setMsgText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder={staff
                  ? `Message ${merchantName}...`
                  : 'Message the Hamari Dukaan team...'}
                style={{
                  flex: 1, padding: '10px 14px', borderRadius: 24, border: '1px solid var(--border)',
                  fontSize: 13, outline: 'none', fontFamily: 'inherit'
                }}
              />
              <button onClick={sendMessage} disabled={sendingMsg || !msgText.trim()}
                style={{
                  width: 42, height: 42, borderRadius: 99, background: msgText.trim() ? 'var(--green)' : '#e0e0e0',
                  border: 'none', cursor: msgText.trim() ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0
                }}>
                {sendingMsg ? '⏳' : '➤'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

