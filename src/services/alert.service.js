import { supabase } from '../lib/supabase'

export async function getAlerts({ onlyUnread = false } = {}) {
  let q = supabase.from('alerts').select('*').order('created_at', { ascending: false })
  if (onlyUnread) q = q.eq('is_read', false)
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function getUnreadCount() {
  const { count, error } = await supabase
    .from('alerts')
    .select('*', { count: 'exact', head: true })
    .eq('is_read', false)
  if (error) throw error
  return count ?? 0
}

export async function markAsRead(id) {
  const { error } = await supabase.from('alerts').update({ is_read: true }).eq('id', id)
  if (error) throw error
}

export async function markAllAsRead() {
  const { error } = await supabase.from('alerts').update({ is_read: true }).eq('is_read', false)
  if (error) throw error
}
