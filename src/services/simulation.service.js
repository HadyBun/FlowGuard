import { supabase } from '../lib/supabase'

export async function getScenarios() {
  const { data, error } = await supabase
    .from('simulation_scenarios')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createScenario(payload) {
  const { data: prof } = await supabase.from('users').select('business_id, id').single()
  const { data, error } = await supabase
    .from('simulation_scenarios')
    .insert({ ...payload, business_id: prof.business_id, created_by: prof.id })
    .select().single()
  if (error) throw error
  return data
}

export async function deleteScenario(id) {
  const { error } = await supabase.from('simulation_scenarios').delete().eq('id', id)
  if (error) throw error
}
