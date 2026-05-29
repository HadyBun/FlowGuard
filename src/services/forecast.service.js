import { supabase } from '../lib/supabase'

// Trigger Edge Function untuk generate forecast baru
export async function triggerForecast() {
  const { data, error } = await supabase.functions.invoke('generate-forecast')
  if (error) throw error
  return data
}

// Ambil detail forecast harian (untuk chart)
export async function getForecastDetails(forecastId, days = 90) {
  let q = supabase
    .from('forecast_details')
    .select('*')
    .order('forecast_date', { ascending: true })
    .limit(days)

  if (forecastId) q = q.eq('forecast_id', forecastId)

  const { data, error } = await q
  if (error) throw error
  return data
}

// Ambil forecast terbaru milik bisnis ini
// FIX: pakai .maybeSingle() biar tidak throw error kalau belum ada data
export async function getLatestForecast() {
  const { data, error } = await supabase
    .from('cashflow_forecasts')
    .select('*, forecast_details(*)')
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data ?? null
}
