import { useEffect, useState } from 'react'
import { getReports, generateReport, getDownloadUrl } from '../services/report.service'
import { FileText, Download, RefreshCw } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'

export default function ReportsPage() {
  const [reports,   setReports]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [genLoad,   setGenLoad]   = useState(false)
  const [dlLoading, setDlLoading] = useState(null)

  async function loadReports() {
    try {
      const data = await getReports()
      setReports(data)
    } catch {
      toast.error('Gagal load reports.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadReports() }, [])

  async function handleGenerate() {
    setGenLoad(true)
    try {
      await generateReport()
      toast.success('Report berhasil di-generate!')
      // Reload dari DB biar format datanya konsisten
      await loadReports()
    } catch {
      toast.error('Gagal generate report. Pastikan Edge Function sudah di-deploy.')
    } finally {
      setGenLoad(false)
    }
  }

  async function handleDownload(report) {
    setDlLoading(report.id)
    try {
      const url = await getDownloadUrl(report.file_url)
      window.open(url, '_blank')
    } catch {
      toast.error('Gagal generate download link.')
    } finally {
      setDlLoading(null)
    }
  }

  return (
    <div className="page-enter">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600 }}>Reports</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Export laporan cashflow dalam format PDF / CSV</p>
        </div>
        <button className="btn btn-primary" onClick={handleGenerate} disabled={genLoad}>
          <RefreshCw size={14} style={{ animation: genLoad ? 'spin 1s linear infinite' : 'none' }} />
          {genLoad ? 'Generating...' : 'Generate Report'}
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead>
            <tr>
              <th>Report Type</th>
              <th>Generated Date</th>
              <th>File</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 4 }).map((_, j) => (
                  <td key={j}><div className="skeleton" style={{ height: 16, width: '80%' }} /></td>
                ))}</tr>
              ))
            ) : reports.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
                  <FileText size={32} style={{ opacity: .2, display: 'block', margin: '0 auto 12px' }} />
                  Belum ada report. Klik "Generate Report" untuk membuat yang pertama.
                </td>
              </tr>
            ) : (
              reports.map(r => (
                <tr key={r.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <FileText size={15} color="var(--text-muted)" />
                      <span style={{ color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                        {r.report_type?.replace('_', ' ') ?? 'Cashflow Report'}
                      </span>
                    </div>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {r.created_at ? format(parseISO(r.created_at), 'dd MMM yyyy HH:mm') : '-'}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.file_url || '—'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {r.file_url ? (
                      <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }}
                        disabled={dlLoading === r.id}
                        onClick={() => handleDownload(r)}>
                        <Download size={13} />
                        {dlLoading === r.id ? 'Getting link...' : 'Download'}
                      </button>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No file</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
