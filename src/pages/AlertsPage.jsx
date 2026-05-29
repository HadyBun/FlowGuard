import { useEffect, useState } from 'react'
import { getAlerts, markAsRead, markAllAsRead } from '../services/alert.service'
import { supabase } from '../lib/supabase'
import { AlertTriangle, Bell, Check, CheckCheck } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'

const SEVERITY_COLOR = { LOW: 'info', MEDIUM: 'warning', HIGH: 'danger', CRITICAL: 'danger' }
const TYPE_LABEL = { DEFICIT_RISK: 'Deficit Risk', OVERDUE_PAYMENT: 'Overdue Payment', LOW_BALANCE: 'Low Balance', FORECAST_UPDATE: 'Forecast Update' }

export default function AlertsPage() {
  const [alerts,  setAlerts]  = useState([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState('ALL') // ALL | UNREAD

  useEffect(() => {
    loadAlerts()

    // Realtime: tambah alert baru langsung ke list
    const channel = supabase
      .channel('alerts-page')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, (payload) => {
        setAlerts(prev => [payload.new, ...prev])
        toast('⚠ Alert baru masuk!', { icon: '🔔' })
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  async function loadAlerts() {
    try {
      const data = await getAlerts({ onlyUnread: filter === 'UNREAD' })
      setAlerts(data)
    } catch { toast.error('Gagal load alerts.') }
    finally { setLoading(false) }
  }

  async function handleMarkRead(id) {
    try {
      await markAsRead(id)
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a))
    } catch { toast.error('Gagal update.') }
  }

  async function handleMarkAll() {
    try {
      await markAllAsRead()
      setAlerts(prev => prev.map(a => ({ ...a, is_read: true })))
      toast.success('Semua alert ditandai sudah dibaca.')
    } catch { toast.error('Gagal update.') }
  }

  const unreadCount = alerts.filter(a => !a.is_read).length
  const displayed   = filter === 'UNREAD' ? alerts.filter(a => !a.is_read) : alerts

  return (
    <div className="page-enter">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 22, fontWeight: 600 }}>Risk Reports</h1>
            {unreadCount > 0 && (
              <span style={{ background: 'var(--danger)', color: '#fff', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10 }}>
                {unreadCount} unread
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Monitoring risiko & anomali keuangan secara realtime</p>
        </div>
        {unreadCount > 0 && (
          <button className="btn btn-ghost" onClick={handleMarkAll} style={{ gap: 6 }}>
            <CheckCheck size={14} /> Mark All Read
          </button>
        )}
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {['ALL', 'UNREAD'].map(f => (
          <button key={f} className="btn" onClick={() => setFilter(f)}
            style={{ padding: '6px 14px', fontSize: 12, background: filter === f ? 'var(--accent-dim)' : 'transparent', color: filter === f ? 'var(--accent)' : 'var(--text-muted)', border: `0.5px solid ${filter === f ? 'var(--accent-glow)' : 'var(--border)'}` }}>
            {f}
          </button>
        ))}
      </div>

      {/* Alert list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 80, borderRadius: 'var(--radius-lg)' }} />
          ))
        ) : displayed.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 60 }}>
            <Bell size={32} style={{ opacity: .2, display: 'block', margin: '0 auto 12px' }} />
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Tidak ada alert{filter === 'UNREAD' ? ' yang belum dibaca' : ''}</div>
          </div>
        ) : (
          displayed.map(a => (
            <div key={a.id} className="card" style={{ opacity: a.is_read ? .6 : 1, transition: 'opacity .2s', padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `var(--${SEVERITY_COLOR[a.severity]}-dim, var(--danger-dim))`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <AlertTriangle size={16} color={`var(--${SEVERITY_COLOR[a.severity]}, var(--danger))`} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span className={`badge badge-${SEVERITY_COLOR[a.severity] || 'muted'}`}>{a.severity}</span>
                    <span className="badge badge-muted">{TYPE_LABEL[a.alert_type] || a.alert_type}</span>
                    {!a.is_read && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--danger)', display: 'inline-block' }} />}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 4 }}>{a.message}</div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-muted)' }}>
                    <span>{format(parseISO(a.alert_date || a.created_at), 'dd MMM yyyy')}</span>
                    {a.threshold_value && <span>Threshold: Rp {Number(a.threshold_value).toLocaleString('id-ID')}</span>}
                  </div>
                </div>
                {!a.is_read && (
                  <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12, flexShrink: 0 }} onClick={() => handleMarkRead(a.id)}>
                    <Check size={12} /> Read
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
