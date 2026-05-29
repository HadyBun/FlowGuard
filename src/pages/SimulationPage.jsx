import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { getScenarios, createScenario, deleteScenario } from '../services/simulation.service'
import { getLatestForecast } from '../services/forecast.service'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Plus, Trash2, FlaskConical } from 'lucide-react'
import toast from 'react-hot-toast'

function fmt(n) {
  if (Math.abs(n) >= 1_000_000) return 'Rp ' + (n / 1_000_000).toFixed(1) + 'M'
  return 'Rp ' + Number(n).toLocaleString('id-ID')
}

export default function SimulationPage() {
  const [scenarios, setScenarios] = useState([])
  const [forecast,  setForecast]  = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [showForm,  setShowForm]  = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => {
    Promise.all([getScenarios(), getLatestForecast()])
      .then(([s, f]) => { setScenarios(s); setForecast(f) })
      .catch(() => toast.error('Gagal load data.'))
      .finally(() => setLoading(false))
  }, [])

  async function onSubmit(data) {
    setSubmitting(true)
    try {
      const s = await createScenario({
        scenario_name:    data.scenario_name,
        modified_income:  parseFloat(data.modified_income),
        modified_expense: parseFloat(data.modified_expense),
      })
      setScenarios(prev => [s, ...prev])
      toast.success('Skenario berhasil dibuat!')
      reset()
      setShowForm(false)
    } catch (err) { toast.error(err.message) }
    finally { setSubmitting(false) }
  }

  async function handleDelete(id) {
    if (!confirm('Hapus skenario ini?')) return
    try {
      await deleteScenario(id)
      setScenarios(prev => prev.filter(s => s.id !== id))
      toast.success('Skenario dihapus.')
    } catch { toast.error('Gagal hapus.') }
  }

  // Bandingkan skenario vs aktual di chart
  const chartData = scenarios.map(s => ({
    name:     s.scenario_name,
    simNet:   Number(s.simulated_net),
    actualNet: forecast ? Number(forecast.net_cashflow) : 0,
  }))

  return (
    <div className="page-enter">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600 }}>What-If Simulation</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Uji skenario finansial tanpa ubah data aktual</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={15} /> New Scenario
        </button>
      </div>

      {/* Comparison chart */}
      {chartData.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 20 }}>Simulasi vs Aktual Net Cashflow</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} width={80} />
              <Tooltip formatter={(v, n) => [fmt(v), n]} contentStyle={{ background: 'var(--bg-elevated)', border: '0.5px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)' }} />
              <Bar dataKey="actualNet" name="Aktual"   fill="#4d9fff" radius={[4,4,0,0]} />
              <Bar dataKey="simNet"    name="Simulasi" fill="#00d4aa" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Scenarios table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '0.5px solid var(--border)', fontSize: 14, fontWeight: 500 }}>Daftar Skenario</div>
        <table>
          <thead>
            <tr>
              <th>Scenario Name</th>
              <th style={{ textAlign: 'right' }}>Modified Income</th>
              <th style={{ textAlign: 'right' }}>Modified Expense</th>
              <th style={{ textAlign: 'right' }}>Simulated Net</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</td></tr>
            ) : scenarios.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
                  <FlaskConical size={28} style={{ opacity: .3, display: 'block', margin: '0 auto 10px' }} />
                  Belum ada skenario
                </td>
              </tr>
            ) : (
              scenarios.map(s => (
                <tr key={s.id}>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{s.scenario_name}</td>
                  <td style={{ textAlign: 'right', color: 'var(--info)' }}>{fmt(s.modified_income)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--danger)' }}>{fmt(s.modified_expense)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: Number(s.simulated_net) >= 0 ? 'var(--accent)' : 'var(--danger)' }}>
                    {fmt(s.simulated_net)}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-danger" style={{ padding: '4px 8px' }} onClick={() => handleDelete(s.id)}>
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* New Scenario Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
          <div className="card" style={{ width: '100%', maxWidth: 400, padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600 }}>New Scenario</h2>
              <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="form-group">
                <label className="label">Scenario Name</label>
                <input className="input" placeholder="e.g. Beli mesin produksi bulan depan"
                  {...register('scenario_name', { required: 'Nama skenario wajib diisi' })} />
                {errors.scenario_name && <p className="error-msg">{errors.scenario_name.message}</p>}
              </div>
              <div className="form-group">
                <label className="label">Modified Income (Rp)</label>
                <input className="input" type="number" placeholder="0"
                  {...register('modified_income', { required: true, min: 0 })} />
              </div>
              <div className="form-group">
                <label className="label">Modified Expense (Rp)</label>
                <input className="input" type="number" placeholder="0"
                  {...register('modified_expense', { required: true, min: 0 })} />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={submitting}>
                  {submitting ? 'Saving...' : 'Create Scenario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
