// supabase/functions/generate-forecast/index.ts
// Deploy: supabase functions deploy generate-forecast
//
// Secrets yang dibutuhkan:
//   SUPABASE_SERVICE_ROLE_KEY  (otomatis ada)
//   ML_API_URL                 (tambahkan manual: URL Railway lo)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // ── Auth ─────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')!
    const { data: { user } } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: corsHeaders }
      )
    }

    // ── Ambil business_id ────────────────────────────────────────────────────
    const { data: profile } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', user.id)
      .single()

    const businessId = profile?.business_id
    if (!businessId) {
      return new Response(
        JSON.stringify({ error: 'Business not found' }),
        { status: 404, headers: corsHeaders }
      )
    }

    // ── Parse body ───────────────────────────────────────────────────────────
    const body    = await req.json().catch(() => ({}))
    const horizon = body.horizon ?? 90

    // ── Ambil data transaksi 6 bulan terakhir ────────────────────────────────
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const { data: transactions, error: txErr } = await supabase
      .from('transactions')
      .select('type, amount, transaction_date')
      .eq('business_id', businessId)
      .gte('transaction_date', sixMonthsAgo.toISOString().split('T')[0])
      .order('transaction_date', { ascending: true })

    if (txErr) throw txErr

    if (!transactions || transactions.length < 2) {
      return new Response(
        JSON.stringify({ error: 'Data transaksi terlalu sedikit. Tambah minimal 2 transaksi dulu.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── Panggil ML API (Railway) ─────────────────────────────────────────────
    const mlApiUrl = Deno.env.get('ML_API_URL')
    if (!mlApiUrl) throw new Error('ML_API_URL secret belum di-set di Supabase.')

    const mlRes = await fetch(`${mlApiUrl}/predict`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        transactions: transactions.map(t => ({
          transaction_date: t.transaction_date,
          type:             t.type,
          amount:           Number(t.amount),
        })),
        horizon,
      }),
    })

    if (!mlRes.ok) {
      const errText = await mlRes.text()
      throw new Error(`ML API error: ${errText}`)
    }

    const mlData = await mlRes.json()

    // ── Simpan header forecast ke Supabase ───────────────────────────────────
    const today   = new Date().toISOString().split('T')[0]
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + horizon)

    const { data: forecast, error: fcErr } = await supabase
      .from('cashflow_forecasts')
      .insert({
        business_id:             businessId,
        generated_by:            user.id,
        start_date:              today,
        end_date:                endDate.toISOString().split('T')[0],
        total_projected_income:  mlData.total_projected_income,
        total_projected_expense: mlData.total_projected_expense,
        net_cashflow:            mlData.net_cashflow,
      })
      .select()
      .single()

    if (fcErr) throw fcErr
    if (!forecast) throw new Error('Gagal buat forecast header')

    // ── Simpan detail harian ─────────────────────────────────────────────────
    const details = mlData.forecast_details.map((d: any) => ({
      forecast_id:       forecast.id,
      forecast_date:     d.forecast_date,
      predicted_income:  d.predicted_income,
      predicted_expense: d.predicted_expense,
      predicted_balance: d.predicted_balance,
      // kolom opsional — tambahkan ke tabel kalau mau tampilkan CI di chart
      balance_upper:     d.balance_upper,
      balance_lower:     d.balance_lower,
    }))

    const { error: detailErr } = await supabase
      .from('forecast_details')
      .insert(details)

    if (detailErr) throw detailErr

    // ── Deteksi defisit & buat alert ─────────────────────────────────────────
    const deficitDays = details.filter((d: any) => d.predicted_balance < 0)
    if (deficitDays.length > 0) {
      const firstDeficit = deficitDays[0]
      await supabase.from('alerts').insert({
        business_id:     businessId,
        forecast_id:     forecast.id,
        alert_type:      'DEFICIT_RISK',
        severity:        deficitDays.length > 30 ? 'CRITICAL' : deficitDays.length > 14 ? 'HIGH' : 'MEDIUM',
        message:         `Potensi defisit kas terdeteksi mulai ${firstDeficit.forecast_date}. ${deficitDays.length} hari dalam ${horizon} hari ke depan diperkirakan defisit.`,
        alert_date:      firstDeficit.forecast_date,
        threshold_value: Math.abs(Math.min(...deficitDays.map((d: any) => d.predicted_balance))),
        is_read:         false,
      })
    }

    return new Response(
      JSON.stringify({
        success:          true,
        forecastId:       forecast.id,
        deficitDaysCount: deficitDays.length,
        model_info:       mlData.model_info,
        summary: {
          total_projected_income:  mlData.total_projected_income,
          total_projected_expense: mlData.total_projected_expense,
          net_cashflow:            mlData.net_cashflow,
          net_cashflow_upper:      mlData.net_cashflow_upper,
          net_cashflow_lower:      mlData.net_cashflow_lower,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error('generate-forecast error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
