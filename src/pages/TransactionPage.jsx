import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { getTransactions, addTransaction, updateTransactionStatus, deleteTransaction } from '../services/transaction.service'
import { Plus, Trash2, Check, Filter } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'

const FILTERS = ['ALL', 'INCOME', 'EXPENSE']
const STATUS_COLORS = { PAID: 'success', PENDING: 'warning', OVERDUE: 'danger' }

export default function TransactionPage() {
  const [txns,       setTxns]       = useState([])
  const [loading,    setLoading]    = useState(true)
  const [filter,     setFilter]     = useState('ALL')
  const [showModal,  setShowModal]  = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  async function load(f = filter) {
    setLoading(true)
    try {
      const data = await getTransactions({ type: f === 'ALL' ? undefined : f })
      setTxns(data)
    } catch { toast.error('Gagal load transaksi.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function onFilterChange(f) {
    setFilter(f)
    load(f)
  }

  async function onSubmit(data) {
    setSubmitting(true)
    try {
      const newTxn = await addTransaction({
        type:             data.type,
        amount:           parseFloat(data.amount),
        category:         data.category,
        description:      data.description,
        payment_method:   data.payment_method,
        transaction_date: data.transaction_date,
        status:           'PENDING',
      })
      setTxns(prev => [newTxn, ...prev])
      toast.success('Transaksi berhasil ditambahkan!')
      reset()
      setShowModal(false)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleStatusUpdate(id, status) {
    try {
      const updated = await updateTransactionStatus(id, status)
      setTxns(prev => prev.map(t => t.id === id ? updated : t))
      toast.success('Status diperbarui.')
    } catch { toast.error('Gagal update status.') }
  }

  async function handleDelete(id) {
    if (!confirm('Hapus transaksi ini?')) return
    try {
      await deleteTransaction(id)
      setTxns(prev => prev.filter(t => t.id !== id))
      toast.success('Transaksi dihapus.')
    } catch (err) { toast.error(err.message) }
  }

  return (
    <div className="page-enter">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600 }}>Transactions</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Riwayat pemasukan & pengeluaran</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={15} /> Add Transaction
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => onFilterChange(f)}
            className="btn"
            style={{
              padding: '6px 14px',
              fontSize: 12,
              background: filter === f ? 'var(--accent-dim)' : 'transparent',
              color:      filter === f ? 'var(--accent)' : 'var(--text-muted)',
              border:     `0.5px solid ${filter === f ? 'var(--accent-glow)' : 'var(--border)'}`,
            }}
          >
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
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Method</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j}><div className="skeleton" style={{ height: 16, width: '80%' }} /></td>
                    ))}
                  </tr>
                ))
              ) : txns.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Belum ada transaksi</td></tr>
              ) : (
                txns.map(t => (
                  <tr key={t.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                      {format(parseISO(t.transaction_date), 'dd MMM yy')}
                    </td>
                    <td style={{ color: 'var(--text-primary)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.description || '-'}
                    </td>
                    <td>{t.category || '-'}</td>
                    <td style={{ fontSize: 12 }}>{t.payment_method?.replace('_', ' ') || '-'}</td>
                    <td>
                      <span className={`badge badge-${STATUS_COLORS[t.status] || 'muted'}`}>
                        {t.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: t.type === 'INCOME' ? 'var(--accent)' : 'var(--danger)', fontWeight: 500 }}>
                      {t.type === 'INCOME' ? '+' : '-'}Rp {Number(t.amount).toLocaleString('id-ID')}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        {t.status !== 'PAID' && (
                          <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 11 }}
                            onClick={() => handleStatusUpdate(t.id, 'PAID')}>
                            <Check size={12} /> Paid
                          </button>
                        )}
                        <button className="btn btn-danger" style={{ padding: '4px 8px' }}
                          onClick={() => handleDelete(t.id)}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Transaction Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
          <div className="card" style={{ width: '100%', maxWidth: 440, padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600 }}>Add Transaction</h2>
              <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="label">Type</label>
                  <select className="input" {...register('type', { required: true })}>
                    <option value="INCOME">Income</option>
                    <option value="EXPENSE">Expense</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="label">Amount (Rp)</label>
                  <input className="input" type="number" placeholder="0"
                    {...register('amount', { required: 'Wajib diisi', min: { value: 1, message: 'Minimal 1' } })} />
                  {errors.amount && <p className="error-msg">{errors.amount.message}</p>}
                </div>
              </div>

              <div style={{ height: 12 }} />

              <div className="form-group">
                <label className="label">Description</label>
                <input className="input" placeholder="e.g. Pembayaran klien A" {...register('description')} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="label">Category</label>
                  <input className="input" placeholder="e.g. Revenue" {...register('category')} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="label">Payment Method</label>
                  <select className="input" {...register('payment_method')}>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CASH">Cash</option>
                    <option value="CREDIT_CARD">Credit Card</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div style={{ height: 12 }} />

              <div className="form-group">
                <label className="label">Date</label>
                <input className="input" type="date"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  {...register('transaction_date', { required: 'Tanggal wajib diisi' })} />
                {errors.transaction_date && <p className="error-msg">{errors.transaction_date.message}</p>}
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}
                  disabled={submitting}>{submitting ? 'Saving...' : 'Save Transaction'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
