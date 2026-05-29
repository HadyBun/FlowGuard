import { supabase } from '../lib/supabase'

export async function getPayables(status) {
  let q = supabase.from('payables').select('*').order('due_date', { ascending: true })
  if (status) q = q.eq('status', status)
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function addPayable(payload) {
  const { data: prof } = await supabase.from('users').select('business_id').single()
  const { data, error } = await supabase
    .from('payables')
    .insert({ ...payload, business_id: prof.business_id })
    .select().single()
  if (error) throw error
  return data
}

export async function updatePayableStatus(id, status) {
  const { data, error } = await supabase
    .from('payables').update({ status }).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deletePayable(id) {
  const { error } = await supabase.from('payables').delete().eq('id', id)
  if (error) throw error
}
