import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'

import LoginPage       from './pages/LoginPage'
import RegisterPage    from './pages/RegisterPage'
import DashboardPage   from './pages/DashboardPage'
import TransactionPage from './pages/TransactionPage'
import ReceivablesPage from './pages/ReceivablesPage'
import PayablesPage    from './pages/PayablesPage'
import ForecastPage    from './pages/ForecastPage'
import AIForecastPage  from './pages/AIForecastPage'
import SimulationPage  from './pages/SimulationPage'
import AlertsPage      from './pages/AlertsPage'
import ReportsPage     from './pages/ReportsPage'
import AIPage          from './pages/AIPage'
import MainLayout      from './components/layout/MainLayout'
import ProtectedRoute  from './routes/ProtectedRoute'

export default function App() {
  const { loading } = useAuth()

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:'var(--text-muted)', fontSize:'13px' }}>
      Initializing...
    </div>
  )

  return (
    <Routes>
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard"    element={<DashboardPage />} />
          <Route path="/transactions" element={<TransactionPage />} />
          <Route path="/receivables"  element={<ReceivablesPage />} />
          <Route path="/payables"     element={<PayablesPage />} />
          <Route path="/forecast"     element={<ForecastPage />} />
          <Route path="/ai-forecast"  element={<AIForecastPage />} />
          <Route path="/simulation"   element={<SimulationPage />} />
          <Route path="/alerts"       element={<AlertsPage />} />
          <Route path="/reports"      element={<ReportsPage />} />
          <Route path="/ai"           element={<AIPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
