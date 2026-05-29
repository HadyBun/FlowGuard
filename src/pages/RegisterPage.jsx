import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const { register: registerUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, watch, formState: { errors } } = useForm()
  const pwd = watch('password')

  async function onSubmit(data) {
    setLoading(true)
    try {
      await registerUser({
        name:         data.name,
        email:        data.email,
        password:     data.password,
        businessName: data.businessName,
      })
    } catch (err) {
      toast.error(err.message || 'Registrasi gagal.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-base)', padding: 20,
    }}>
      <div style={{ position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 400, height: 400, background: 'radial-gradient(circle, rgba(0,212,170,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#000', marginBottom: 12 }}>F</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '.12em', textTransform: 'uppercase' }}>
            FlowGuard — Create Operator Profile
          </div>
        </div>

        <div className="card" style={{ padding: 28 }}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="form-group">
              <label className="label">Full Name</label>
              <input className="input" placeholder="e.g. Julian Vane"
                {...register('name', { required: 'Nama wajib diisi', pattern: { value: /^[a-zA-Z\s]+$/, message: 'Nama tidak boleh mengandung angka' } })} />
              {errors.name && <p className="error-msg">{errors.name.message}</p>}
            </div>

            <div className="form-group">
              <label className="label">Business Name</label>
              <input className="input" placeholder="e.g. Nebula Dynamics"
                {...register('businessName', { required: 'Nama bisnis wajib diisi' })} />
              {errors.businessName && <p className="error-msg">{errors.businessName.message}</p>}
            </div>

            <div className="form-group">
              <label className="label">Email Address</label>
              <input className="input" type="email" placeholder="e.g. julian@nebula.io"
                {...register('email', { required: 'Email wajib diisi', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Format email tidak valid' } })} />
              {errors.email && <p className="error-msg">{errors.email.message}</p>}
            </div>

            <div className="form-group">
              <label className="label">Password</label>
              <input className="input" type="password" placeholder="••••••••••••"
                {...register('password', { required: 'Password wajib diisi', minLength: { value: 8, message: 'Min 8 karakter' }, pattern: { value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, message: 'Harus ada huruf besar, kecil, dan angka' } })} />
              {errors.password && <p className="error-msg">{errors.password.message}</p>}
            </div>

            <div className="form-group">
              <label className="label">Confirm Password</label>
              <input className="input" type="password" placeholder="••••••••••••"
                {...register('confirm', { required: 'Konfirmasi password wajib diisi', validate: v => v === pwd || 'Password tidak cocok' })} />
              {errors.confirm && <p className="error-msg">{errors.confirm.message}</p>}
            </div>

            <button type="submit" className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: 11, marginTop: 4 }}
              disabled={loading}>
              {loading ? 'Creating profile...' : 'Register'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--text-muted)' }}>
            Sudah punya akun?{' '}
            <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 500 }}>Decrypt Login</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
