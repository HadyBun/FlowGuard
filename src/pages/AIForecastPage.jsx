import { useState } from 'react'
import { generateAIForecast } from '../services/ai-forecast.service'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, RadarChart,
  PolarGrid, PolarAngleAxis, Radar,
} from 'recharts'
import { Sparkles, TrendingUp, TrendingDown, Minus, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'

const TREND_CONFIG = {
  IMPROVING: { icon: TrendingUp,   color: 'var(--accent)',   label: 'Membaik' },
  STABLE:    { icon: Minus,        color: 'var(--info)',     label: 'Stabil'  },
  DECLINING: { icon: TrendingDown, color: 'var(--danger)',   label: 'Menurun' },
}

const PRIORITY_COLOR = { HIGH: 'danger', MEDIUM: 'warning', LOW: 'info' }
const SEVERITY_COLOR  = { LOW: 'info', MEDIUM: 'warning', HIGH: 'danger', CRITICAL: 'danger' }

function fmt(n) {
  if (!n && n !== 0) return '-'
  const abs = Math.abs(Number(n))
  const sign = Number(n) < 0 ? '-' : ''
  if (abs >= 1_000_000_000) return sign + 'Rp ' + (abs / 1_000_000_000).toFixed(1) + 'B'
  if (abs >= 1_000_000)     return sign + 'Rp ' + (abs / 1_000_000).toFixed(1)     + 'M'
  if (abs >= 1_000)         return sign + 'Rp ' + (abs / 1_000).toFixed(0)         + 'K'
  return sign + 'Rp ' + abs.toLocaleString('id-ID')
}

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="card" style={{ marginBottom: 16, padding: 0, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: open ? '0.5px solid var(--border)' : 'none' }}
      >
        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{title}</span>
        {open ? <ChevronUp size={15} color="var(--text-muted)" /> : <ChevronDown size={15} color="var(--text-muted)" />}
      </button>
      {open && <div style={{ padding: '16px 20px' }}>{children}</div>}
    </div>
  )
}

export default function AIForecastPage() {
  const [result,  setResult]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [horizon, setHorizon] = useState(90)

  async function handleGenerate() {
    setLoading(true)
    setResult(null)
    try {
      const data = await generateAIForecast(horizon)
      setResult(data)
      toast.success('AI Forecast berhasil di-generate!')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const analysis = result?.analysis

  // Data untuk chart proyeksi 3 titik
  const projectionData = analysis ? [
    {
      name:        '30 Hari',
      Optimistic:  analysis.cashflowProjection?.day30?.optimistic,
      Realistic:   analysis.cashflowProjection?.day30?.realistic,
      Pessimistic: analysis.cashflowProjection?.day30?.pessimistic,
    },
    {
      name:        '60 Hari',
      Optimistic:  analysis.cashflowProjection?.day60?.optimistic,
      Realistic:   analysis.cashflowProjection?.day60?.realistic,
      Pessimistic: analysis.cashflowProjection?.day60?.pessimistic,
    },
    {
      name:        '90 Hari',
      Optimistic:  analysis.cashflowProjection?.day90?.optimistic,
      Realistic:   analysis.cashflowProjection?.day90?.realistic,
      Pessimistic: analysis.cashflowProjection?.day90?.pessimistic,
    },
  ] : []

  const TrendIcon   = analysis ? TREND_CONFIG[analysis.trend]?.icon   : null
  const trendColor  = analysis ? TREND_CONFIG[analysis.trend]?.color  : null
  const trendLabel  = analysis ? TREND_CONFIG[analysis.trend]?.label  : null

  return (
    <div className="page-enter">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1 style={{ fontSize: 22, fontWeight: 600 }}>AI Cashflow Forecast</h1>
            <span className="badge badge-info" style={{ fontSize: 10 }}>
              <Sparkles size={10} /> AI Powered
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Prediksi cashflow berbasis AI — analisis pola, deteksi risiko, rekomendasi aksi
          </p>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            value={horizon}
            onChange={e => setHorizon(Number(e.target.value))}
            className="input"
            style={{ width: 120 }}
          >
            <option value={30}>30 hari</option>
            <option value={60}>60 hari</option>
            <option value={90}>90 hari</option>
          </select>
          <button
            className="btn btn-primary"
            onClick={handleGenerate}
            disabled={loading}
            style={{ gap: 6, whiteSpace: 'nowrap' }}
          >
            <Sparkles size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            {loading ? 'AI Analyzing...' : 'Generate AI Forecast'}
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <Sparkles size={32} color="var(--accent)" style={{ display: 'block', margin: '0 auto 16px', animation: 'spin 2s linear infinite' }} />
          <div style={{ fontSize: 14, color: 'var(--text-primary)', marginBottom: 8 }}>AI sedang menganalisis data keuangan lo...</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Biasanya 5–15 detik</div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !result && (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <Sparkles size={40} style={{ display: 'block', margin: '0 auto 16px', opacity: .2 }} />
          <div style={{ fontSize: 14, color: 'var(--text-primary)', marginBottom: 8 }}>Belum ada AI forecast</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 340, margin: '0 auto 20px' }}>
            AI bakal analisis pola transaksi 6 bulan terakhir lo dan prediksi cashflow dengan 3 skenario: optimistic, realistic, pessimistic
          </div>
          <button className="btn btn-primary" onClick={handleGenerate}>
            <Sparkles size={14} /> Generate AI Forecast
          </button>
        </div>
      )}

      {/* Results */}
      {!loading && analysis && (
        <>
          {/* Overview row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>

            {/* Trend */}
            <div className="card" style={{ padding: '14px 18px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Tren</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {TrendIcon && <TrendIcon size={20} color={trendColor} />}
                <span style={{ fontSize: 18, fontWeight: 600, color: trendColor }}>{trendLabel}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{analysis.trendReason}</div>
            </div>

            {/* Confidence */}
            <div className="card" style={{ padding: '14px 18px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Confidence Level</div>
              <div style={{ fontSize: 24, fontWeight: 600, color: analysis.confidenceLevel >= 70 ? 'var(--accent)' : analysis.confidenceLevel >= 50 ? 'var(--warning)' : 'var(--danger)' }}>
                {analysis.confidenceLevel}%
              </div>
              <div style={{ height: 4, background: 'var(--bg-overlay)', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${analysis.confidenceLevel}%`, background: analysis.confidenceLevel >= 70 ? 'var(--accent)' : analysis.confidenceLevel >= 50 ? 'var(--warning)' : 'var(--danger)', borderRadius: 2, transition: 'width .5s ease' }} />
              </div>
            </div>

            {/* Deficit risk */}
            <div className="card" style={{ padding: '14px 18px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Risiko Defisit</div>
              {analysis.deficitRisk?.detected ? (
                <>
                  <span className={`badge badge-${SEVERITY_COLOR[analysis.deficitRisk.severity] || 'warning'}`}>
                    <AlertTriangle size={10} /> {analysis.deficitRisk.severity}
                  </span>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                    {analysis.deficitRisk.estimatedDate ? `Mulai ${analysis.deficitRisk.estimatedDate}` : 'Dalam periode ini'}
                  </div>
                  {analysis.deficitRisk.estimatedAmount && (
                    <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 2 }}>
                      {fmt(analysis.deficitRisk.estimatedAmount)}
                    </div>
                  )}
                </>
              ) : (
                <span className="badge badge-success">✓ Aman</span>
              )}
            </div>

            {/* Realistic 90d */}
            <div className="card" style={{ padding: '14px 18px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Proyeksi {horizon}D (Realistic)</div>
              <div style={{ fontSize: 20, fontWeight: 600, color: Number(analysis.cashflowProjection?.day90?.realistic) >= 0 ? 'var(--accent)' : 'var(--danger)' }}>
                {fmt(analysis.cashflowProjection?.day90?.realistic)}
              </div>
            </div>
          </div>

          {/* Summary */}
          <div style={{ background: 'var(--accent-dim)', border: '0.5px solid var(--accent-glow)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 16, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.65 }}>
            <Sparkles size={13} color="var(--accent)" style={{ verticalAlign: '-2px', marginRight: 6 }} />
            {analysis.summary}
          </div>

          {/* Projection chart */}
          <Section title="Proyeksi Cashflow — 3 Skenario">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={projectionData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} width={80} />
                <Tooltip formatter={(v, n) => [fmt(v), n]} contentStyle={{ background: 'var(--bg-elevated)', border: '0.5px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)' }} />
                <Bar dataKey="Optimistic"  fill="var(--accent)"   radius={[4,4,0,0]} opacity={.8} />
                <Bar dataKey="Realistic"   fill="var(--info)"     radius={[4,4,0,0]} />
                <Bar dataKey="Pessimistic" fill="var(--danger)"   radius={[4,4,0,0]} opacity={.7} />
              </BarChart>
            </ResponsiveContainer>
          </Section>

          {/* Period predictions */}
          {analysis.predictions?.length > 0 && (
            <Section title="Prediksi per Periode">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {analysis.predictions.map((p, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 1fr', gap: 12, padding: '12px 0', borderBottom: i < analysis.predictions.length - 1 ? '0.5px solid var(--border)' : 'none', alignItems: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{p.period}</div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Est. Income</div>
                      <div style={{ fontSize: 13, color: 'var(--accent)' }}>{fmt(p.estimatedIncome)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Est. Expense</div>
                      <div style={{ fontSize: 13, color: 'var(--danger)' }}>{fmt(p.estimatedExpense)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Est. Balance</div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: Number(p.estimatedBalance) >= 0 ? 'var(--accent)' : 'var(--danger)' }}>{fmt(p.estimatedBalance)}</div>
                    </div>
                    {p.notes && (
                      <div style={{ gridColumn: '1 / -1', fontSize: 12, color: 'var(--text-muted)', paddingTop: 4 }}>
                        💡 {p.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Key insights */}
          {analysis.keyInsights?.length > 0 && (
            <Section title="Key Insights dari AI">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {analysis.keyInsights.map((insight, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent-dim)', border: '0.5px solid var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>
                      {i + 1}
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0, paddingTop: 2 }}>{insight}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Recommendations */}
          {analysis.recommendations?.length > 0 && (
            <Section title="Rekomendasi Aksi">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {analysis.recommendations.map((r, i) => (
                  <div key={i} style={{ padding: '14px 16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '0.5px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span className={`badge badge-${PRIORITY_COLOR[r.priority] || 'muted'}`}>{r.priority}</span>
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{r.action}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>📌 {r.reason}</div>
                    {r.estimatedImpact && (
                      <div style={{ fontSize: 12, color: 'var(--accent)' }}>💰 Dampak: {r.estimatedImpact}</div>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Meta info */}
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right', marginTop: 8 }}>
            Generated at {new Date(result.generatedAt).toLocaleString('id-ID')} · Horizon {result.horizon} hari
          </div>
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
