import { supabase } from '../lib/supabase'

export async function getReceivables(status) {
  let q = supabase.from('receivables').select('*').order('due_date', { ascending: true })
  if (status) q = q.eq('status', status)
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function addReceivable(payload) {
  const { data: prof } = await supabase.from('users').select('business_id').single()
  const { data, error } = await supabase
    .from('receivables')
    .insert({ ...payload, business_id: prof.business_id })
    .select().single()
  if (error) throw error
  return data
}

export async function updateReceivableStatus(id, status) {
  const { data, error } = await supabase
    .from('receivables').update({ status }).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteReceivable(id) {
  const { error } = await supabase.from('receivables').delete().eq('id', id)
  if (error) throw error
}
