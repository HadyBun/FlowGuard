import { useEffect, useState } from 'react'
import { getLatestForecast, triggerForecast } from '../services/forecast.service'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { format, parseISO } from 'date-fns'
import { RefreshCw, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'

function fmt(n) {
  if (Math.abs(n) >= 1_000_000) return 'Rp ' + (n / 1_000_000).toFixed(1) + 'M'
  if (Math.abs(n) >= 1_000)     return 'Rp ' + (n / 1_000).toFixed(0) + 'K'
  return 'Rp ' + n.toLocaleString('id-ID')
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '0.5px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color, marginBottom: 2 }}>{p.name}: {fmt(p.value)}</div>
      ))}
    </div>
  )
}

export default function ForecastPage() {
  const [forecast, setForecast] = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [genLoad,  setGenLoad]  = useState(false)

  async function load() {
    try {
      const f = await getLatestForecast()
      setForecast(f)
    } catch { toast.error('Gagal load forecast.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function handleGenerate() {
    setGenLoad(true)
    try {
      await triggerForecast()
      await load()
      toast.success('Forecast berhasil di-generate!')
    } catch { toast.error('Gagal generate. Pastikan Edge Function sudah di-deploy.') }
    finally { setGenLoad(false) }
  }

  const chartData = forecast?.forecast_details?.map(d => ({
    date:    format(parseISO(d.forecast_date), 'dd MMM'),
    balance: Number(d.predicted_balance),
    income:  Number(d.predicted_income),
    expense: Number(d.predicted_expense),
  })) ?? []

  const hasDeficit = chartData.some(d => d.balance < 0)

  return (
    <div className="page-enter">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600 }}>Cashflow Forecast</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Prediksi arus kas 90 hari ke depan</p>
        </div>
        <button className="btn btn-primary" onClick={handleGenerate} disabled={genLoad}>
          <RefreshCw size={14} style={{ animation: genLoad ? 'spin 1s linear infinite' : 'none' }} />
          {genLoad ? 'Generating...' : 'Generate Forecast'}
        </button>
      </div>

      {/* Summary header */}
      {forecast && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Projected Income',  value: fmt(Number(forecast.total_projected_income)), color: 'var(--info)' },
            { label: 'Projected Expense', value: fmt(Number(forecast.total_projected_expense)), color: 'var(--danger)' },
            { label: 'Net Cashflow',      value: fmt(Number(forecast.net_cashflow)), color: Number(forecast.net_cashflow) >= 0 ? 'var(--accent)' : 'var(--danger)' },
          ].map(c => (
            <div key={c.label} className="card" style={{ padding: '14px 18px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>{c.label}</div>
              <div style={{ fontSize: 20, fontWeight: 600, color: c.color }}>{c.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Deficit warning */}
      {hasDeficit && (
        <div style={{ background: 'var(--danger-dim)', border: '0.5px solid rgba(240,78,106,.3)', borderRadius: 'var(--radius-md)', padding: '10px 16px', marginBottom: 16, fontSize: 13, color: 'var(--danger)' }}>
          ⚠ Potensi defisit kas terdeteksi dalam periode prediksi ini
        </div>
      )}

      {/* Chart */}
      <div className="card">
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 20 }}>Predicted Balance — 90 Hari</div>
        {loading ? (
          <div className="skeleton" style={{ height: 280 }} />
        ) : chartData.length === 0 ? (
          <div style={{ height: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--text-muted)' }}>
            <TrendingUp size={32} style={{ opacity: .3 }} />
            <span style={{ fontSize: 13 }}>Klik "Generate Forecast" untuk melihat prediksi</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#00d4aa" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#00d4aa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} interval={14} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} width={80} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="var(--danger)" strokeDasharray="4 4" strokeWidth={1} />
              <Area type="monotone" dataKey="balance" name="Balance" stroke="var(--accent)" strokeWidth={2} fill="url(#balGrad)" dot={false} />
              <Area type="monotone" dataKey="income"  name="Income"  stroke="var(--info)"  strokeWidth={1.5} fill="none" dot={false} strokeDasharray="4 4" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Detail table */}
      {chartData.length > 0 && (
        <div className="card" style={{ marginTop: 16, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '0.5px solid var(--border)', fontSize: 14, fontWeight: 500 }}>Detail Harian</div>
          <div className="table-wrap" style={{ maxHeight: 300, overflowY: 'auto' }}>
            <table>
              <thead><tr><th>Tanggal</th><th style={{ textAlign: 'right' }}>Predicted Income</th><th style={{ textAlign: 'right' }}>Predicted Expense</th><th style={{ textAlign: 'right' }}>Predicted Balance</th></tr></thead>
              <tbody>
                {forecast?.forecast_details?.map(d => (
                  <tr key={d.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{format(parseISO(d.forecast_date), 'dd MMMM yyyy')}</td>
                    <td style={{ textAlign: 'right', color: 'var(--info)' }}>{fmt(Number(d.predicted_income))}</td>
                    <td style={{ textAlign: 'right', color: 'var(--danger)' }}>{fmt(Number(d.predicted_expense))}</td>
                    <td style={{ textAlign: 'right', fontWeight: 500, color: Number(d.predicted_balance) >= 0 ? 'var(--accent)' : 'var(--danger)' }}>{fmt(Number(d.predicted_balance))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
