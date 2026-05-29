import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { getTransactionSummary } from '../services/transaction.service'
import { getLatestForecast, triggerForecast } from '../services/forecast.service'
import { getAlerts } from '../services/alert.service'
import { TrendingUp, TrendingDown, Wallet, RefreshCw, AlertTriangle } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'

function SummaryCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '.06em', textTransform: 'uppercase' }}>{label}</span>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={15} color={color} />
        </div>
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{sub}</div>}
      </div>
    </div>
  )
}

function fmt(n) {
  if (n >= 1_000_000) return 'Rp ' + (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return 'Rp ' + (n / 1_000).toFixed(0) + 'K'
  return 'Rp ' + n.toLocaleString('id-ID')
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '0.5px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: {fmt(p.value)}
        </div>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const { profile } = useAuth()
  const [summary,  setSummary]  = useState(null)
  const [forecast, setForecast] = useState(null)
  const [alerts,   setAlerts]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [genLoading, setGenLoading] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [s, f, a] = await Promise.all([
          getTransactionSummary(),
          getLatestForecast(),
          getAlerts({ onlyUnread: true }),
        ])
        setSummary(s)
        setForecast(f)
        setAlerts(a)
      } catch (err) {
        toast.error('Gagal load data dashboard.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleGenForecast() {
    setGenLoading(true)
    try {
      await triggerForecast()
      const f = await getLatestForecast()
      setForecast(f)
      toast.success('Forecast berhasil di-generate!')
    } catch {
      toast.error('Forecast gagal. Pastikan Edge Function sudah di-deploy.')
    } finally {
      setGenLoading(false)
    }
  }

  const chartData = forecast?.forecast_details?.map(d => ({
    date:    format(parseISO(d.forecast_date), 'dd MMM'),
    balance: Number(d.predicted_balance),
    income:  Number(d.predicted_income),
    expense: Number(d.predicted_expense),
  })) ?? []

  return (
    <div className="page-enter">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)' }}>Cash Flow</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
            {profile?.businesses?.business_name} — {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button className="btn btn-ghost" onClick={handleGenForecast} disabled={genLoading} style={{ gap: 6 }}>
          <RefreshCw size={14} style={{ animation: genLoading ? 'spin 1s linear infinite' : 'none' }} />
          {genLoading ? 'Generating...' : 'Generate Forecast'}
        </button>
      </div>

      {/* Unread alerts banner */}
      {alerts.length > 0 && (
        <div style={{ background: 'var(--danger-dim)', border: '0.5px solid rgba(240,78,106,.3)', borderRadius: 'var(--radius-md)', padding: '10px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--danger)' }}>
          <AlertTriangle size={15} />
          {alerts.length} risk alert aktif — cek halaman Risk Reports
        </div>
      )}

      {/* Summary cards */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 100 }} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
          <SummaryCard label="Current Balance"  value={fmt(summary?.balance ?? 0)} icon={Wallet}       color="var(--accent)"   sub="Bulan ini" />
          <SummaryCard label="Monthly Revenue"  value={fmt(summary?.income  ?? 0)} icon={TrendingUp}   color="var(--info)"     sub="Total pemasukan" />
          <SummaryCard label="Outflow"          value={fmt(summary?.expense ?? 0)} icon={TrendingDown} color="var(--danger)"   sub="Total pengeluaran" />
        </div>
      )}

      {/* Forecast chart */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Cashflow Forecast</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Prediksi 90 hari ke depan</div>
          </div>
          <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 20, height: 2, background: 'var(--accent)', display: 'inline-block', borderRadius: 1 }} /> Balance</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 20, height: 2, background: 'var(--info)', display: 'inline-block', borderRadius: 1 }} /> Income</span>
          </div>
        </div>

        {chartData.length === 0 ? (
          <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Klik "Generate Forecast" untuk generate prediksi
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} interval={13} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} width={80} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="balance" name="Balance" stroke="var(--accent)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="income"  name="Income"  stroke="var(--info)"  strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
