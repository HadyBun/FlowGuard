import AIAdvisor from '../components/ai/AIAdvisor'

export default function AIPage() {
  return (
    <div className="page-enter">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>AI Advisor</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
          Tanya kondisi keuangan bisnis lo — dijawab berdasarkan data real-time
        </p>
      </div>
      <AIAdvisor />
    </div>
  )
}
