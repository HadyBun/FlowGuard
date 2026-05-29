import { supabase } from '../lib/supabase'

/**
 * Generate AI-powered cashflow prediction
 * @param {30|60|90} horizon - jumlah hari prediksi
 * @returns {Promise<object>} - hasil analisis AI lengkap
 */
export async function generateAIForecast(horizon = 90) {
  const { data: { session } } = await supabase.auth.getSession()

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-forecast`,
    {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ horizon }),
    }
  )

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? 'AI forecast gagal')
  }

  return res.json()
}
