import { useAuthContext } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export function useAuth() {
  const { user, profile, loading } = useAuthContext()
  const navigate = useNavigate()

  async function register({ name, email, password, businessName }) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, business_name: businessName } }
    })
    if (error) throw error
    toast.success('Akun berhasil dibuat! Cek email untuk verifikasi.')
    navigate('/login')
  }

  async function login({ email, password }) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    navigate('/dashboard')
  }

  async function logout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return { user, profile, loading, register, login, logout }
}
