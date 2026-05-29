import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import AIAdvisor from '../ai/AIAdvisor'
import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { getUnreadCount } from '../../services/alert.service'
import { supabase } from '../../lib/supabase'
import {
  LayoutDashboard, ArrowLeftRight, TrendingUp,
  FlaskConical, Bell, FileText, LogOut, ChevronRight,
  ArrowDownLeft, ArrowUpRight, Sparkles
} from 'lucide-react'

const navItems = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: ArrowLeftRight,  label: 'Transactions' },
  { to: '/receivables',  icon: ArrowDownLeft,   label: 'Receivables' },
  { to: '/payables',     icon: ArrowUpRight,    label: 'Payables' },
  { to: '/forecast',     icon: TrendingUp,      label: 'Forecast' },
  { to: '/ai-forecast',  icon: Sparkles,        label: 'AI Forecast' },
  { to: '/simulation',   icon: FlaskConical,    label: 'Simulation' },
  { to: '/alerts',       icon: Bell,            label: 'Risk Reports' },
  { to: '/reports',      icon: FileText,        label: 'Reports' },
  { to: '/ai',           icon: Sparkles,        label: 'AI Advisor' },
]

export default function MainLayout() {
  const { profile, logout } = useAuth()
  const [unread, setUnread]     = useState(0)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    getUnreadCount().then(setUnread)

    // Realtime: update badge saat alert baru masuk
    const channel = supabase
      .channel('alert-count')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, () => {
        setUnread(n => n + 1)
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside style={{
        width: collapsed ? 60 : 220,
        flexShrink: 0,
        background: 'var(--bg-surface)',
        borderRight: '0.5px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 0',
        transition: 'width .2s ease',
        overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{ padding: '0 16px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'var(--accent)', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#000', fontSize: 13, fontWeight: 700,
          }}>F</div>
          {!collapsed && (
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
              FlowGuard
            </span>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 10px',
                borderRadius: 'var(--radius-md)',
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                background: isActive ? 'var(--accent-dim)' : 'transparent',
                fontSize: 13,
                fontWeight: isActive ? 500 : 400,
                transition: 'all .15s',
                position: 'relative',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              })}
            >
              <Icon size={16} style={{ flexShrink: 0 }} />
              {!collapsed && label}
              {label === 'Risk Reports' && unread > 0 && !collapsed && (
                <span style={{
                  marginLeft: 'auto',
                  background: 'var(--danger)',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '1px 6px',
                  borderRadius: 10,
                }}>
                  {unread}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User + logout */}
        <div style={{ padding: '12px 8px 0', borderTop: '0.5px solid var(--border)', marginTop: 8 }}>
          {!collapsed && profile && (
            <div style={{ padding: '0 10px 10px' }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profile.name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profile.businesses?.business_name}
              </div>
            </div>
          )}
          <button
            onClick={logout}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', padding: '9px 10px',
              background: 'none', border: 'none',
              color: 'var(--text-muted)', fontSize: 13,
              borderRadius: 'var(--radius-md)', transition: 'all .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--danger-dim)'; e.currentTarget.style.color = 'var(--danger)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            <LogOut size={16} style={{ flexShrink: 0 }} />
            {!collapsed && 'Logout'}
          </button>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          style={{
            position: 'absolute', top: 20,
            left: collapsed ? 44 : 204,
            width: 20, height: 20,
            border: '0.5px solid var(--border)',
            borderRadius: '50%',
            background: 'var(--bg-elevated)',
            color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'left .2s ease',
            zIndex: 10,
          }}
        >
          <ChevronRight size={12} style={{ transform: collapsed ? 'none' : 'rotate(180deg)', transition: 'transform .2s' }} />
        </button>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto', padding: 28 }}>
        <Outlet />
      </main>

      {/* AI floating bubble — muncul di semua halaman */}
      <AIAdvisor floating={true} />
    </div>
  )
}
