import { supabase } from '../lib/supabase'

export async function getTransactions({ type, status, limit = 50 } = {}) {
  let q = supabase
    .from('transactions')
    .select('*')
    .order('transaction_date', { ascending: false })
    .limit(limit)

  if (type)   q = q.eq('type', type)
  if (status) q = q.eq('status', status)

  const { data, error } = await q
  if (error) throw error
  return data
}

export async function addTransaction(payload) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data: prof }     = await supabase.from('users').select('business_id').single()

  const { data, error } = await supabase
    .from('transactions')
    .insert({ ...payload, user_id: user.id, business_id: prof.business_id })
    .select().single()
  if (error) throw error
  return data
}

export async function updateTransactionStatus(id, status) {
  const { data, error } = await supabase
    .from('transactions')
    .update({ status })
    .eq('id', id)
    .select().single()
  if (error) throw error
  return data
}

export async function deleteTransaction(id) {
  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) throw error
}

// Summary untuk dashboard
export async function getTransactionSummary() {
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('transactions')
    .select('type, amount, status')
    .gte('transaction_date', startOfMonth.toISOString().split('T')[0])

  if (error) throw error

  const income  = data.filter(t => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0)
  const expense = data.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0)

  return { income, expense, balance: income - expense }
}
