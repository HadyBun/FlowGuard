import { useState, useRef, useEffect } from 'react'
import { askAI } from '../../services/ai.service'
import { Send, Bot, User, Sparkles, X, Minimize2, Maximize2 } from 'lucide-react'

// Pertanyaan cepat yang bisa diklik user
const QUICK_PROMPTS = [
  'Gimana kondisi cashflow bulan ini?',
  'Ada risiko defisit kas gak?',
  'Piutang mana yang harus segera ditagih?',
  'Rekomendasi penghematan pengeluaran?',
  'Kapan waktu terbaik bayar hutang?',
]

function MessageBubble({ msg }) {
  const isAI = msg.role === 'assistant'

  return (
    <div style={{
      display:       'flex',
      gap:           10,
      flexDirection: isAI ? 'row' : 'row-reverse',
      alignItems:    'flex-start',
      marginBottom:  16,
    }}>
      {/* Avatar */}
      <div style={{
        width:          30,
        height:         30,
        borderRadius:   '50%',
        background:     isAI ? 'var(--accent-dim)' : 'var(--bg-overlay)',
        border:         `0.5px solid ${isAI ? 'var(--accent-glow)' : 'var(--border)'}`,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        flexShrink:     0,
      }}>
        {isAI
          ? <Bot  size={14} color="var(--accent)" />
          : <User size={14} color="var(--text-secondary)" />
        }
      </div>

      {/* Bubble */}
      <div style={{
        maxWidth:     '75%',
        padding:      '10px 14px',
        borderRadius: isAI ? '4px 12px 12px 12px' : '12px 4px 12px 12px',
        background:   isAI ? 'var(--bg-elevated)' : 'var(--accent-dim)',
        border:       `0.5px solid ${isAI ? 'var(--border)' : 'var(--accent-glow)'}`,
        fontSize:     13,
        color:        'var(--text-primary)',
        lineHeight:   1.65,
        whiteSpace:   'pre-wrap',
      }}>
        {msg.content}
        {msg.loading && (
          <span style={{ display: 'inline-flex', gap: 3, marginLeft: 4, verticalAlign: 'middle' }}>
            {[0, 1, 2].map(i => (
              <span key={i} style={{
                width:            5,
                height:           5,
                borderRadius:     '50%',
                background:       'var(--accent)',
                display:          'inline-block',
                animation:        `dot-pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              }} />
            ))}
          </span>
        )}
      </div>
    </div>
  )
}

export default function AIAdvisor({ floating = false }) {
  const [messages,   setMessages]   = useState([
    {
      role:    'assistant',
      content: 'Halo! Gue FlowGuard AI. Tanya apa aja soal kondisi keuangan bisnis lo — gue bakal jawab berdasarkan data real-time lo.',
    }
  ])
  const [input,      setInput]      = useState('')
  const [loading,    setLoading]    = useState(false)
  const [minimized,  setMinimized]  = useState(false)
  const [open,       setOpen]       = useState(!floating)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(text) {
    const userMsg = text ?? input.trim()
    if (!userMsg || loading) return

    setInput('')

    // Tambah pesan user ke UI
    const newMessages = [
      ...messages,
      { role: 'user', content: userMsg },
      { role: 'assistant', content: '', loading: true },
    ]
    setMessages(newMessages)
    setLoading(true)

    try {
      // Kirim history tanpa pesan loading (yang terakhir)
      const history = newMessages.slice(0, -1).map(m => ({
        role:    m.role,
        content: m.content,
      }))

      const reply = await askAI(history)

      // Replace loading bubble dengan jawaban
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: reply },
      ])
    } catch (err) {
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: `Maaf, terjadi error: ${err.message}. Coba lagi ya.` },
      ])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  // ── Floating mode (bubble di sudut) ───────────────────────────────────────
  if (floating) {
    return (
      <>
        <style>{`
          @keyframes dot-pulse {
            0%, 80%, 100% { transform: scale(0.6); opacity: .4; }
            40%            { transform: scale(1);   opacity: 1; }
          }
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(16px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        {/* Chat window */}
        {open && (
          <div style={{
            position:     'fixed',
            bottom:       80,
            right:        24,
            width:        360,
            height:       minimized ? 56 : 520,
            background:   'var(--bg-surface)',
            border:       '0.5px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
            display:      'flex',
            flexDirection:'column',
            zIndex:       200,
            overflow:     'hidden',
            animation:    'slideUp .2s ease',
            transition:   'height .2s ease',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: minimized ? 'none' : '0.5px solid var(--border)', background: 'var(--bg-elevated)' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-dim)', border: '0.5px solid var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={13} color="var(--accent)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>FlowGuard AI</div>
                {!minimized && <div style={{ fontSize: 11, color: 'var(--accent)' }}>● Online</div>}
              </div>
              <button onClick={() => setMinimized(m => !m)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
                {minimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
              </button>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
                <X size={14} />
              </button>
            </div>

            {!minimized && <ChatBody messages={messages} loading={loading} input={input} setInput={setInput} send={send} handleKey={handleKey} inputRef={inputRef} bottomRef={bottomRef} />}
          </div>
        )}

        {/* FAB button */}
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            position:       'fixed',
            bottom:         24,
            right:          24,
            width:          52,
            height:         52,
            borderRadius:   '50%',
            background:     open ? 'var(--bg-elevated)' : 'var(--accent)',
            border:         `0.5px solid ${open ? 'var(--border)' : 'var(--accent)'}`,
            color:          open ? 'var(--text-secondary)' : '#000',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            cursor:         'pointer',
            zIndex:         201,
            transition:     'all .2s',
          }}
        >
          {open ? <X size={20} /> : <Sparkles size={20} />}
        </button>
      </>
    )
  }

  // ── Inline mode (embed di halaman) ────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes dot-pulse {
          0%, 80%, 100% { transform: scale(0.6); opacity: .4; }
          40%            { transform: scale(1);   opacity: 1; }
        }
      `}</style>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', height: 560, padding: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg-elevated)' }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accent-dim)', border: '0.5px solid var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={14} color="var(--accent)" />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>FlowGuard AI Advisor</div>
            <div style={{ fontSize: 11, color: 'var(--accent)' }}>● Terhubung ke data real-time bisnis lo</div>
          </div>
        </div>

        <ChatBody messages={messages} loading={loading} input={input} setInput={setInput} send={send} handleKey={handleKey} inputRef={inputRef} bottomRef={bottomRef} />
      </div>
    </>
  )
}

// ── Sub-komponen body chat ────────────────────────────────────────────────────

function ChatBody({ messages, loading, input, setInput, send, handleKey, inputRef, bottomRef }) {
  return (
    <>
      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px' }}>
        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      <div style={{ padding: '0 12px 10px', display: 'flex', gap: 6, overflowX: 'auto', flexWrap: 'nowrap' }}>
        {QUICK_PROMPTS.map(p => (
          <button
            key={p}
            onClick={() => send(p)}
            disabled={loading}
            style={{
              flexShrink:   0,
              padding:      '5px 12px',
              borderRadius: 20,
              border:       '0.5px solid var(--border)',
              background:   'var(--bg-elevated)',
              color:        'var(--text-secondary)',
              fontSize:     11,
              cursor:       'pointer',
              whiteSpace:   'nowrap',
              transition:   'all .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-glow)'; e.currentTarget.style.color = 'var(--accent)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{ padding: '0 12px 14px', display: 'flex', gap: 8 }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Tanya soal keuangan bisnis lo..."
          disabled={loading}
          rows={1}
          style={{
            flex:        1,
            padding:     '9px 14px',
            background:  'var(--bg-elevated)',
            border:      '0.5px solid var(--border)',
            borderRadius:'var(--radius-md)',
            color:       'var(--text-primary)',
            fontSize:    13,
            outline:     'none',
            resize:      'none',
            fontFamily:  'var(--font-sans)',
            lineHeight:  1.5,
            maxHeight:   100,
            overflowY:   'auto',
          }}
          onFocus={e  => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e   => e.target.style.borderColor = 'var(--border)'}
          onInput={e  => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
        />
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          className="btn btn-primary"
          style={{ padding: '9px 14px', flexShrink: 0 }}
        >
          <Send size={14} />
        </button>
      </div>
    </>
  )
}
