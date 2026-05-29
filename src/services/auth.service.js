import { supabase } from '../lib/supabase'

export async function getProfile() {
  const { data, error } = await supabase
    .from('users')
    .select('*, businesses(*)')
    .single()
  if (error) throw error
  return data
}
