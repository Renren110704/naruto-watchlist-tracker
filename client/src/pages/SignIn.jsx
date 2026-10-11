import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AlertCircle, Eye, EyeOff, LogIn } from 'lucide-react'
import { Field } from '../components/Controls'
import { Spinner } from '../components/States'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { parseApiError } from '../services/api'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function SignIn() {
  const { signin, sessionMessage, clearSessionMessage } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)

  const update = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
    setErrors((er) => ({ ...er, [field]: undefined }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const v = {}
    if (!form.email.trim()) v.email = 'Email is required'
    else if (!EMAIL_RE.test(form.email.trim())) v.email = 'Enter a valid email address'
    if (!form.password) v.password = 'Password is required'
    setErrors(v)
    setFormError(null)
    if (Object.keys(v).length) return

    setBusy(true)
    try {
      const res = await signin({ email: form.email.trim(), password: form.password })
      clearSessionMessage()
      toast.success(res.message)
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true })
    } catch (err) {
      const { message, details } = parseApiError(err)
      setErrors(details)
      setFormError(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <h2 className="text-3xl font-semibold">Welcome back</h2>
      <p className="mt-2 text-sm text-cream-500">Sign in to continue your watch-through.</p>

      {(formError || sessionMessage) && (
        <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-leaf-500/40 bg-leaf-500/10 px-3.5 py-3 text-sm text-leaf-400" role="alert">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {formError || sessionMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        <Field label="Email" htmlFor="email" error={errors.email}>
          <input id="email" type="email" autoComplete="email" className={`input ${errors.email ? 'input-error' : ''}`} value={form.email} onChange={update('email')} aria-invalid={Boolean(errors.email)} />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password}>
          <div className="relative">
            <input id="password" type={show ? 'text' : 'password'} autoComplete="current-password" className={`input pr-10 ${errors.password ? 'input-error' : ''}`} value={form.password} onChange={update('password')} aria-invalid={Boolean(errors.password)} />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-cream-500 hover:text-cream-100" aria-label={show ? 'Hide password' : 'Show password'}>
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>
        <button type="submit" className="btn-primary w-full py-3" disabled={busy}>
          {busy ? <Spinner /> : <LogIn className="size-4" />} Sign in
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-cream-500">
        New here?{' '}
        <Link to="/signup" className="font-semibold text-fox-400 hover:text-fox-300">
          Create an account
        </Link>
      </p>
    </div>
  )
}
