import { supabase } from '../lib/supabase'

export async function getReports() {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function generateReport() {
  const { data, error } = await supabase.functions.invoke('generate-report')
  if (error) throw error
  return data
}

// Buat signed URL untuk download file dari Storage
export async function getDownloadUrl(filePath) {
  const { data, error } = await supabase.storage
    .from('reports')
    .createSignedUrl(filePath, 60 * 60) // expires 1 jam
  if (error) throw error
  return data.signedUrl
}
