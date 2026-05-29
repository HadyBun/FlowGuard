// supabase/functions/ai-forecast/index.ts
// Deploy: npx supabase functions deploy ai-forecast --project-ref xxxxxx
//
// Secrets yang dibutuhkan (sama dengan ai-advisor):
//   AI_API_KEY, AI_PROVIDER, AI_MODEL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// ── Helper ────────────────────────────────────────────────────────────────────

function groupByMonth(transactions: any[]) {
  const map: Record<string, { income: number; expense: number; count: number }> = {}
  for (const t of transactions) {
    const month = t.transaction_date.slice(0, 7) // "2026-03"
    if (!map[month]) map[month] = { income: 0, expense: 0, count: 0 }
    if (t.type === 'INCOME')  map[month].income  += Number(t.amount)
    if (t.type === 'EXPENSE') map[month].expense += Number(t.amount)
    map[month].count++
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, ...v, net: v.income - v.expense }))
}

function groupByCategory(transactions: any[]) {
  const map: Record<string, number> = {}
  for (const t of transactions) {
    const key = `${t.type}:${t.category ?? 'Uncategorized'}`
    map[key] = (map[key] ?? 0) + Number(t.amount)
  }
  return Object.entries(map)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([key, total]) => {
      const [type, category] = key.split(':')
      return { type, category, total }
    })
}

function fmt(n: number) {
  return `Rp ${Math.abs(n).toLocaleString('id-ID')}`
}

// ── Call AI ───────────────────────────────────────────────────────────────────

async function callAI(prompt: string): Promise<string> {
  const provider = Deno.env.get('AI_PROVIDER') ?? 'anthropic'
  const apiKey   = Deno.env.get('AI_API_KEY')!
  const model    = Deno.env.get('AI_MODEL') ?? 'claude-sonnet-4-20250514'

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
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!res.ok) throw new Error(`Anthropic error: ${await res.text()}`)
    const data = await res.json()
    return data.content[0].text

  } else {
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
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!res.ok) throw new Error(`AI error: ${await res.text()}`)
    const data = await res.json()
    return data.choices[0].message.content
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
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

    // Ambil business
    const { data: profile } = await supabase
      .from('users')
      .select('business_id, businesses(business_name, industry)')
      .eq('id', user.id)
      .single()

    const businessId   = profile?.business_id
    const businessName = profile?.businesses?.business_name ?? 'Bisnis'
    const industry     = profile?.businesses?.industry ?? 'Tidak diketahui'

    // Parse body — horizon bisa 30, 60, atau 90 hari
    const body    = await req.json().catch(() => ({}))
    const horizon = body.horizon ?? 90 // hari

    // Ambil data historis 6 bulan terakhir
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const [txnRes, recRes, payRes, alertRes] = await Promise.all([
      supabase
        .from('transactions')
        .select('type, amount, category, description, transaction_date, status')
        .eq('business_id', businessId)
        .gte('transaction_date', sixMonthsAgo.toISOString().split('T')[0])
        .order('transaction_date', { ascending: true }),

      supabase
        .from('receivables')
        .select('client_name, amount, due_date, status')
        .eq('business_id', businessId)
        .neq('status', 'PAID'),

      supabase
        .from('payables')
        .select('vendor_name, amount, due_date, status')
        .eq('business_id', businessId)
        .neq('status', 'PAID'),

      supabase
        .from('alerts')
        .select('alert_type, severity, message')
        .eq('business_id', businessId)
        .eq('is_read', false),
    ])

    const transactions = txnRes.data ?? []
    const receivables  = recRes.data ?? []
    const payables     = payRes.data ?? []
    const alerts       = alertRes.data ?? []

    if (transactions.length < 3) {
      return new Response(
        JSON.stringify({ error: 'Data transaksi terlalu sedikit. Tambah minimal 3 transaksi dulu untuk generate AI forecast.' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    // Prepare data summary untuk AI
    const byMonth    = groupByMonth(transactions)
    const byCategory = groupByCategory(transactions)

    const totalIncome  = transactions.filter(t => t.type === 'INCOME').reduce((s, t)  => s + Number(t.amount), 0)
    const totalExpense = transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0)
    const currentBal   = totalIncome - totalExpense
    const totalAR      = receivables.reduce((s, r) => s + Number(r.amount), 0)
    const totalAP      = payables.reduce((s, p)    => s + Number(p.amount), 0)

    // Jatuh tempo dalam horizon
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + horizon)
    const futureDateStr = futureDate.toISOString().split('T')[0]
    const todayStr      = new Date().toISOString().split('T')[0]

    const scheduledInflow  = receivables.filter(r => r.due_date >= todayStr && r.due_date <= futureDateStr)
    const scheduledOutflow = payables.filter(p   => p.due_date >= todayStr && p.due_date <= futureDateStr)

    // ── Prompt ke AI ─────────────────────────────────────────────────────────
    const prompt = `Kamu adalah AI analis keuangan untuk bisnis bernama "${businessName}" (industri: ${industry}).

Tugasmu: Analisis data keuangan historis berikut dan generate prediksi cashflow untuk ${horizon} hari ke depan.

=== DATA HISTORIS 6 BULAN TERAKHIR ===

Tren Bulanan:
${byMonth.map(m => `- ${m.month}: Income ${fmt(m.income)} | Expense ${fmt(m.expense)} | Net ${m.net >= 0 ? '+' : ''}${fmt(m.net)} | ${m.count} transaksi`).join('\n')}

Top Kategori Transaksi:
${byCategory.map(c => `- [${c.type}] ${c.category}: ${fmt(c.total)}`).join('\n')}

Kondisi Saat Ini:
- Balance saat ini: ${fmt(currentBal)} ${currentBal >= 0 ? '(positif)' : '(DEFISIT)'}
- Total piutang belum lunas: ${fmt(totalAR)}
- Total hutang belum lunas: ${fmt(totalAP)}

Scheduled Cash Inflow (${horizon} hari ke depan dari piutang):
${scheduledInflow.length > 0
  ? scheduledInflow.map(r => `- ${r.due_date}: ${r.client_name} ${fmt(r.amount)}`).join('\n')
  : '- Tidak ada piutang jatuh tempo dalam periode ini'}

Scheduled Cash Outflow (${horizon} hari ke depan dari hutang):
${scheduledOutflow.length > 0
  ? scheduledOutflow.map(p => `- ${p.due_date}: ${p.vendor_name} ${fmt(p.amount)}`).join('\n')
  : '- Tidak ada hutang jatuh tempo dalam periode ini'}

Alert Aktif:
${alerts.length > 0
  ? alerts.map(a => `- [${a.severity}] ${a.message}`).join('\n')
  : '- Tidak ada alert'}

=== INSTRUKSI OUTPUT ===

Berikan analisis dan prediksi dalam format JSON berikut (HANYA JSON, tidak ada teks lain):

{
  "summary": "ringkasan kondisi keuangan dalam 2-3 kalimat",
  "trend": "IMPROVING | STABLE | DECLINING",
  "trendReason": "penjelasan singkat kenapa trend ini",
  "confidenceLevel": 0-100,
  "confidenceReason": "kenapa confidence segini",
  "predictions": [
    {
      "period": "label periode misal 'Minggu 1', 'Bulan 1'",
      "estimatedIncome": angka,
      "estimatedExpense": angka,
      "estimatedBalance": angka,
      "notes": "catatan penting untuk periode ini"
    }
  ],
  "deficitRisk": {
    "detected": true/false,
    "estimatedDate": "YYYY-MM-DD atau null",
    "estimatedAmount": angka atau null,
    "severity": "LOW | MEDIUM | HIGH | CRITICAL"
  },
  "keyInsights": [
    "insight 1 yang actionable",
    "insight 2 yang actionable",
    "insight 3 yang actionable"
  ],
  "recommendations": [
    {
      "priority": "HIGH | MEDIUM | LOW",
      "action": "tindakan spesifik yang harus dilakukan",
      "reason": "kenapa ini penting",
      "estimatedImpact": "dampak finansial jika dilakukan"
    }
  ],
  "cashflowProjection": {
    "day30":  { "optimistic": angka, "realistic": angka, "pessimistic": angka },
    "day60":  { "optimistic": angka, "realistic": angka, "pessimistic": angka },
    "day90":  { "optimistic": angka, "realistic": angka, "pessimistic": angka }
  }
}`

    // Call AI
    const rawReply = await callAI(prompt)

    // Parse JSON dari response AI
    let parsed: any
    try {
      const cleaned = rawReply.replace(/```json|```/g, '').trim()
      parsed = JSON.parse(cleaned)
    } catch {
      // Kalau AI balik bukan pure JSON, coba extract
      const match = rawReply.match(/\{[\s\S]*\}/)
      if (match) {
        parsed = JSON.parse(match[0])
      } else {
        throw new Error('AI tidak mengembalikan format JSON yang valid')
      }
    }

    // Simpan hasil ke cashflow_forecasts dengan flag ai_generated
    const today   = new Date().toISOString().split('T')[0]
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + horizon)

    const { data: forecastRow } = await supabase
      .from('cashflow_forecasts')
      .insert({
        business_id:             businessId,
        generated_by:            user.id,
        start_date:              today,
        end_date:                endDate.toISOString().split('T')[0],
        total_projected_income:  parsed.cashflowProjection?.day90?.realistic ?? 0,
        total_projected_expense: 0,
      })
      .select()
      .single()

    // Kalau AI detect defisit, buat alert otomatis
    if (parsed.deficitRisk?.detected && forecastRow) {
      await supabase.from('alerts').insert({
        business_id:     businessId,
        forecast_id:     forecastRow.id,
        alert_type:      'DEFICIT_RISK',
        severity:        parsed.deficitRisk.severity ?? 'MEDIUM',
        message:         `AI Forecast: Potensi defisit ${parsed.deficitRisk.estimatedDate ? `mulai ${parsed.deficitRisk.estimatedDate}` : 'dalam periode ini'}. ${parsed.summary}`,
        alert_date:      parsed.deficitRisk.estimatedDate ?? today,
        threshold_value: parsed.deficitRisk.estimatedAmount,
        is_read:         false,
      })
    }

    return new Response(
      JSON.stringify({
        success:    true,
        horizon,
        forecastId: forecastRow?.id,
        analysis:   parsed,
        generatedAt: new Date().toISOString(),
      }),
      {
        headers: {
          'Content-Type':                'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    )

  } catch (err: any) {
    console.error('ai-forecast error:', err)
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
