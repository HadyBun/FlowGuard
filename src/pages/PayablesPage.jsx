import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { getPayables, addPayable, updatePayableStatus, deletePayable } from '../services/payable.service'
import { Plus, Trash2, Check, Clock } from 'lucide-react'
import { format, parseISO, isPast } from 'date-fns'
import toast from 'react-hot-toast'

const STATUS_COLORS = { PAID: 'success', PENDING: 'warning', OVERDUE: 'danger' }

export default function PayablesPage() {
  const [items,      setItems]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [showModal,  setShowModal]  = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [filter,     setFilter]     = useState('ALL')

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  async function load() {
    setLoading(true)
    try {
      const data = await getPayables(filter === 'ALL' ? undefined : filter)
      setItems(data)
    } catch { toast.error('Gagal load hutang.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filter])

  async function onSubmit(data) {
    setSubmitting(true)
    try {
      const newItem = await addPayable({
        vendor_name: data.vendor_name,
        amount:      parseFloat(data.amount),
        due_date:    data.due_date,
        status:      'PENDING',
      })
      setItems(prev => [newItem, ...prev])
      toast.success('Hutang berhasil ditambahkan!')
      reset()
      setShowModal(false)
    } catch (err) { toast.error(err.message) }
    finally { setSubmitting(false) }
  }

  async function handleMarkPaid(id) {
    try {
      const updated = await updatePayableStatus(id, 'PAID')
      setItems(prev => prev.map(i => i.id === id ? updated : i))
      toast.success('Ditandai sudah dibayar.')
    } catch { toast.error('Gagal update.') }
  }

  async function handleMarkOverdue(id) {
    try {
      const updated = await updatePayableStatus(id, 'OVERDUE')
      setItems(prev => prev.map(i => i.id === id ? updated : i))
      toast.success('Ditandai overdue.')
    } catch { toast.error('Gagal update.') }
  }

  async function handleDelete(id) {
    if (!confirm('Hapus hutang ini?')) return
    try {
      await deletePayable(id)
      setItems(prev => prev.filter(i => i.id !== id))
      toast.success('Hutang dihapus.')
    } catch (err) { toast.error(err.message) }
  }

  const today = new Date().toISOString().split('T')[0]
  const totalPending = items.filter(i => i.status === 'PENDING' && i.due_date >= today).reduce((s, i) => s + Number(i.amount), 0)
  const totalOverdue = items.filter(i => i.status === 'OVERDUE' || (i.status === 'PENDING' && i.due_date < today)).reduce((s, i) => s + Number(i.amount), 0)

  function fmt(n) {
    if (n >= 1_000_000) return 'Rp ' + (n / 1_000_000).toFixed(1) + 'M'
    return 'Rp ' + Number(n).toLocaleString('id-ID')
  }

  const displayed = filter === 'ALL' ? items : items.filter(i => i.status === filter)

  return (
    <div className="page-enter">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600 }}>Payables</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Kewajiban pembayaran ke vendor</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={15} /> Add Payable
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div className="card" style={{ padding: '14px 18px' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Total Pending</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--warning)' }}>{fmt(totalPending)}</div>
        </div>
        <div className="card" style={{ padding: '14px 18px' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Total Overdue</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--danger)' }}>{fmt(totalOverdue)}</div>
        </div>
        <div className="card" style={{ padding: '14px 18px' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Total Items</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>{items.length}</div>
        </div>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {['ALL', 'PENDING', 'OVERDUE', 'PAID'].map(f => (
          <button key={f} className="btn" onClick={() => setFilter(f)}
            style={{ padding: '6px 14px', fontSize: 12, background: filter === f ? 'var(--accent-dim)' : 'transparent', color: filter === f ? 'var(--accent)' : 'var(--text-muted)', border: `0.5px solid ${filter === f ? 'var(--accent-glow)' : 'var(--border)'}` }}>
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Vendor</th>
                <th>Due Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 5 }).map((_, j) => (
                    <td key={j}><div className="skeleton" style={{ height: 16, width: '80%' }} /></td>
                  ))}</tr>
                ))
              ) : displayed.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>Belum ada data hutang</td></tr>
              ) : (
                displayed.map(item => {
                  const isOverdue = item.status === 'PENDING' && isPast(parseISO(item.due_date))
                  return (
                    <tr key={item.id}>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{item.vendor_name}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: isOverdue ? 'var(--danger)' : 'var(--text-secondary)' }}>
                        {format(parseISO(item.due_date), 'dd MMM yyyy')}
                        {isOverdue && <span style={{ fontSize: 10, marginLeft: 6, color: 'var(--danger)' }}>LEWAT JATUH TEMPO</span>}
                      </td>
                      <td><span className={`badge badge-${STATUS_COLORS[item.status] || 'muted'}`}>{item.status}</span></td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 500, color: 'var(--danger)' }}>
                        {fmt(item.amount)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          {item.status === 'PENDING' && (
                            <>
                              <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 11 }}
                                onClick={() => handleMarkPaid(item.id)}>
                                <Check size={12} /> Paid
                              </button>
                              {isOverdue && (
                                <button className="btn btn-danger" style={{ padding: '4px 8px', fontSize: 11 }}
                                  onClick={() => handleMarkOverdue(item.id)}>
                                  <Clock size={12} /> Overdue
                                </button>
                              )}
                            </>
                          )}
                          <button className="btn btn-danger" style={{ padding: '4px 8px' }}
                            onClick={() => handleDelete(item.id)}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
          <div className="card" style={{ width: '100%', maxWidth: 400, padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600 }}>Add Payable</h2>
              <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => { setShowModal(false); reset() }}>✕</button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="form-group">
                <label className="label">Vendor Name</label>
                <input className="input" placeholder="e.g. PT Supplier Utama"
                  {...register('vendor_name', { required: 'Nama vendor wajib diisi' })} />
                {errors.vendor_name && <p className="error-msg">{errors.vendor_name.message}</p>}
              </div>
              <div className="form-group">
                <label className="label">Amount (Rp)</label>
                <input className="input" type="number" placeholder="0"
                  {...register('amount', { required: 'Amount wajib diisi', min: { value: 1, message: 'Minimal 1' } })} />
                {errors.amount && <p className="error-msg">{errors.amount.message}</p>}
              </div>
              <div className="form-group">
                <label className="label">Due Date</label>
                <input className="input" type="date"
                  {...register('due_date', { required: 'Due date wajib diisi' })} />
                {errors.due_date && <p className="error-msg">{errors.due_date.message}</p>}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => { setShowModal(false); reset() }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}
                  disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
