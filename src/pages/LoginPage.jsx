import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const { login } = useAuth()
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm()

  async function onSubmit(data) {
    setLoading(true)
    try {
      await login(data)
    } catch (err) {
      toast.error(err.message || 'Login gagal. Cek email & password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-base)',
      padding: 20,
    }}>
      {/* Glow background accent */}
      <div style={{
        position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: 400, height: 400,
        background: 'radial-gradient(circle, rgba(0,212,170,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 380 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'var(--accent)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 700, color: '#000', marginBottom: 12,
          }}>F</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '.12em', textTransform: 'uppercase' }}>
            FlowGuard — Initialize Session
          </div>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: 28 }}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="form-group">
              <label className="label">Operator ID (Email)</label>
              <input
                className="input"
                type="email"
                placeholder="name@business.io"
                {...register('email', {
                  required: 'Email wajib diisi',
                  pattern: { value: /^\S+@\S+\.\S+$/, message: 'Format email tidak valid' }
                })}
              />
              {errors.email && <p className="error-msg">{errors.email.message}</p>}
            </div>

            <div className="form-group">
              <label className="label">Access Cipher (Password)</label>
              <input
                className="input"
                type="password"
                placeholder="••••••••••••"
                {...register('password', {
                  required: 'Password wajib diisi',
                  minLength: { value: 8, message: 'Minimal 8 karakter' }
                })}
              />
              {errors.password && <p className="error-msg">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '11px', marginTop: 4 }}
              disabled={loading}
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--text-muted)' }}>
            Belum punya akun?{' '}
            <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 500 }}>
              Create Profile
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
