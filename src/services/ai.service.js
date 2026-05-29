import { supabase } from '../lib/supabase'

/**
 * Kirim pesan ke AI advisor.
 * @param {Array<{role: string, content: string}>} messages - history conversation
 * @returns {Promise<string>} - jawaban AI
 */
export async function askAI(messages) {
  const { data: { session } } = await supabase.auth.getSession()

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-advisor`,
    {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ messages }),
    }
  )

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? 'AI request gagal')
  }

  const data = await res.json()
  return data.reply
}
