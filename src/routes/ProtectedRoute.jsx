import { Navigate, Outlet } from 'react-router-dom'
import { useAuthContext } from '../context/AuthContext'

export default function ProtectedRoute() {
  const { user, loading } = useAuthContext()

  if (loading) return null
  if (!user)   return <Navigate to="/login" replace />

  return <Outlet />
}
