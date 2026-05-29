// supabase/functions/ai-advisor/index.ts
// Deploy: npx supabase functions deploy ai-advisor --project-ref xxxxxx
//
// Secrets yang perlu di-set:
//   npx supabase secrets set AI_API_KEY=your-key --project-ref xxxxxx
//   npx supabase secrets set AI_MODEL=claude-sonnet-4-20250514 --project-ref xxxxxx
//   npx supabase secrets set AI_PROVIDER=anthropic --project-ref xxxxxx
//
// Provider yang didukung: "anthropic" | "openai"

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// ── Tipe data ────────────────────────────────────────────────────────────────

interface Message {
  role:    'user' | 'assistant'
  content: string
}

interface BusinessContext {
  businessName:     string
  currentBalance:   number
  monthlyIncome:    number
  monthlyExpense:   number
  totalReceivables: number
  totalPayables:    number
  overdueAR:        number
  overdueAP:        number
  forecastNet:      number | null
  hasDeficit:       boolean
  deficitStartDate: string | null
  recentTxns:       any[]
  upcomingDue:      any[]
  activeAlerts:     any[]
}

// ── Ambil context bisnis dari Supabase ───────────────────────────────────────

async function getBusinessContext(businessId: string): Promise<BusinessContext> {
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const [txnRes, recRes, payRes, forecastRes, alertRes] = await Promise.all([
    // Transaksi bulan ini
    supabase
      .from('transactions')
      .select('type, amount, description, category, transaction_date, status')
      .eq('business_id', businessId)
      .gte('transaction_date', startOfMonth.toISOString().split('T')[0])
      .order('transaction_date', { ascending: false }),

    // Semua receivables yang belum lunas
    supabase
      .from('receivables')
      .select('client_name, amount, due_date, status')
      .eq('business_id', businessId)
      .neq('status', 'PAID'),

    // Semua payables yang belum lunas
    supabase
      .from('payables')
      .select('vendor_name, amount, due_date, status')
      .eq('business_id', businessId)
      .neq('status', 'PAID'),

    // Forecast terbaru
    supabase
      .from('cashflow_forecasts')
      .select('net_cashflow, forecast_details(forecast_date, predicted_balance)')
      .eq('business_id', businessId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single(),

    // Alert aktif yang belum dibaca
    supabase
      .from('alerts')
      .select('message, severity, alert_type, alert_date, threshold_value')
      .eq('business_id', businessId)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const txns      = txnRes.data  ?? []
  const recs      = recRes.data  ?? []
  const pays      = payRes.data  ?? []
  const forecast  = forecastRes.data
  const alerts    = alertRes.data ?? []

  // Kalkulasi summary
  const monthlyIncome  = txns.filter(t => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0)
  const monthlyExpense = txns.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0)
  const totalAR        = recs.reduce((s, r) => s + Number(r.amount), 0)
  const totalAP        = pays.reduce((s, p) => s + Number(p.amount), 0)
  const overdueAR      = recs.filter(r => r.status === 'OVERDUE').reduce((s, r) => s + Number(r.amount), 0)
  const overdueAP      = pays.filter(p => p.status === 'OVERDUE').reduce((s, p) => s + Number(p.amount), 0)

  // Cek potensi defisit dari forecast
  const details       = forecast?.forecast_details ?? []
  const deficitDays   = details.filter((d: any) => Number(d.predicted_balance) < 0)
  const hasDeficit    = deficitDays.length > 0
  const deficitStart  = hasDeficit
    ? deficitDays.sort((a: any, b: any) => a.forecast_date.localeCompare(b.forecast_date))[0].forecast_date
    : null

  // 7 hari ke depan yang jatuh tempo
  const nextWeek = new Date()
  nextWeek.setDate(nextWeek.getDate() + 7)
  const nextWeekStr = nextWeek.toISOString().split('T')[0]
  const todayStr    = new Date().toISOString().split('T')[0]

  const upcomingDue = [
    ...recs.filter(r => r.due_date >= todayStr && r.due_date <= nextWeekStr)
           .map(r => ({ type: 'receivable', name: r.client_name, amount: r.amount, due_date: r.due_date })),
    ...pays.filter(p => p.due_date >= todayStr && p.due_date <= nextWeekStr)
           .map(p => ({ type: 'payable',    name: p.vendor_name, amount: p.amount, due_date: p.due_date })),
  ].sort((a, b) => a.due_date.localeCompare(b.due_date))

  return {
    businessName:     '',
    currentBalance:   monthlyIncome - monthlyExpense,
    monthlyIncome,
    monthlyExpense,
    totalReceivables: totalAR,
    totalPayables:    totalAP,
    overdueAR,
    overdueAP,
    forecastNet:      forecast ? Number(forecast.net_cashflow) : null,
    hasDeficit,
    deficitStartDate: deficitStart,
    recentTxns:       txns.slice(0, 5),
    upcomingDue,
    activeAlerts:     alerts,
  }
}

// ── Format context jadi system prompt ────────────────────────────────────────

function buildSystemPrompt(ctx: BusinessContext, businessName: string): string {
  const fmt = (n: number) => `Rp ${Number(n).toLocaleString('id-ID')}`

  return `Kamu adalah FlowGuard AI, asisten keuangan cerdas untuk bisnis ${businessName}.
Tugasmu adalah membantu pemilik bisnis memahami kondisi keuangan mereka dan memberikan saran yang actionable berdasarkan data real-time.

KONDISI KEUANGAN SAAT INI (data real-time dari sistem):
- Balance bulan ini: ${fmt(ctx.currentBalance)}
- Pemasukan bulan ini: ${fmt(ctx.monthlyIncome)}
- Pengeluaran bulan ini: ${fmt(ctx.monthlyExpense)}
- Total piutang (belum lunas): ${fmt(ctx.totalReceivables)}
- Total hutang (belum lunas): ${fmt(ctx.totalPayables)}
- Piutang overdue: ${fmt(ctx.overdueAR)}
- Hutang overdue: ${fmt(ctx.overdueAP)}
- Proyeksi net cashflow 90 hari: ${ctx.forecastNet !== null ? fmt(ctx.forecastNet) : 'Belum ada forecast'}
- Potensi defisit: ${ctx.hasDeficit ? `Ya, mulai ${ctx.deficitStartDate}` : 'Tidak ada'}

TRANSAKSI TERBARU:
${ctx.recentTxns.length > 0
  ? ctx.recentTxns.map(t => `- ${t.transaction_date} | ${t.type} | ${t.category ?? '-'} | ${fmt(t.amount)} | ${t.status}`).join('\n')
  : 'Tidak ada transaksi bulan ini'}

JATUH TEMPO 7 HARI KE DEPAN:
${ctx.upcomingDue.length > 0
  ? ctx.upcomingDue.map(d => `- ${d.due_date} | ${d.type === 'receivable' ? 'TAGIH dari' : 'BAYAR ke'} ${d.name} | ${fmt(d.amount)}`).join('\n')
  : 'Tidak ada yang jatuh tempo minggu ini'}

ALERT AKTIF:
${ctx.activeAlerts.length > 0
  ? ctx.activeAlerts.map(a => `- [${a.severity}] ${a.message}`).join('\n')
  : 'Tidak ada alert aktif'}

INSTRUKSI:
- Jawab dalam Bahasa Indonesia yang natural dan mudah dipahami
- Berikan insight spesifik berdasarkan data di atas, bukan jawaban generik
- Kalau ada risiko, jelaskan dan berikan rekomendasi konkret
- Gunakan format yang rapi (boleh pakai bullet point kalau perlu)
- Jangan lebih dari 300 kata per jawaban kecuali diminta detail
- Kamu HANYA bisa menjawab pertanyaan seputar keuangan bisnis ini`
}

// ── Call AI provider ─────────────────────────────────────────────────────────

async function callAI(messages: Message[], systemPrompt: string): Promise<string> {
  const provider = Deno.env.get('AI_PROVIDER') ?? 'anthropic'
  const apiKey   = Deno.env.get('AI_API_KEY')!
  const model    = Deno.env.get('AI_MODEL') ?? 'claude-sonnet-4-20250514'

  // ── Anthropic ──────────────────────────────────────────────────────────────
  if (provider === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system:     systemPrompt,
        messages:   messages.map(m => ({ role: m.role, content: m.content })),
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Anthropic error: ${err}`)
    }

    const data = await res.json()
    return data.content[0].text

  // ── OpenAI ─────────────────────────────────────────────────────────────────
  } else if (provider === 'openai') {
    // Supports OpenAI, Groq (gsk_...), or any OpenAI-compatible API
    const baseUrl = apiKey.startsWith('gsk_')
      ? 'https://api.groq.com/openai/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions'

    const res = await fetch(baseUrl, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map(m => ({ role: m.role, content: m.content })),
        ],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`AI error: ${err}`)
    }

    const data = await res.json()
    return data.choices[0].message.content

  } else {
    throw new Error(`Provider tidak dikenali: ${provider}. Gunakan "anthropic" atau "openai"`)
  }
}

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin':  '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      }
    })
  }

  try {
    // Auth
    const authHeader = req.headers.get('Authorization')!
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Parse body — terima messages (array conversation history)
    const body = await req.json()
    const messages: Message[] = body.messages ?? []

    if (!messages.length) {
      return new Response(JSON.stringify({ error: 'messages array kosong' }), { status: 400 })
    }

    // Ambil profil + business
    const { data: profile } = await supabase
      .from('users')
      .select('business_id, name, businesses(business_name)')
      .eq('id', user.id)
      .single()

    const businessId   = profile?.business_id
    const businessName = profile?.businesses?.business_name ?? 'Bisnis'

    if (!businessId) {
      return new Response(JSON.stringify({ error: 'Business not found' }), { status: 404 })
    }

    // Ambil context keuangan real-time
    const ctx          = await getBusinessContext(businessId)
    const systemPrompt = buildSystemPrompt(ctx, businessName)

    // Call AI
    const reply = await callAI(messages, systemPrompt)

    return new Response(
      JSON.stringify({ reply }),
      {
        headers: {
          'Content-Type':                 'application/json',
          'Access-Control-Allow-Origin':  '*',
        }
      }
    )

  } catch (err: any) {
    console.error('ai-advisor error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: {
          'Content-Type':                'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    )
  }
})
