import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, Check, UserPlus } from 'lucide-react'
import { Field } from '../components/Controls'
import { Spinner } from '../components/States'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { parseApiError } from '../services/api'
import { validatePassword, validateUsername } from '../utils/validation'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function PasswordRules({ password }) {
  const rules = [
    { ok: password.length >= 8, text: 'At least 8 characters' },
    { ok: /[A-Za-z]/.test(password), text: 'Contains a letter' },
    { ok: /\d/.test(password), text: 'Contains a number' },
  ]
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
      {rules.map((r) => (
        <li key={r.text} className={`flex items-center gap-1 ${r.ok ? 'text-chakra-400' : 'text-cream-500'}`}>
          <Check className={`size-3 ${r.ok ? '' : 'opacity-30'}`} /> {r.text}
        </li>
      ))}
    </ul>
  )
}

export default function SignUp() {
  const { signup } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [busy, setBusy] = useState(false)

  const update = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
    setErrors((er) => ({ ...er, [field]: undefined }))
  }

  function validate() {
    const v = {}
    const u = validateUsername(form.username.trim())
    if (u) v.username = u
    if (!form.email.trim()) v.email = 'Email is required'
    else if (!EMAIL_RE.test(form.email.trim())) v.email = 'Enter a valid email address'
    const p = validatePassword(form.password)
    if (p) v.password = p
    if (!form.confirmPassword) v.confirmPassword = 'Please confirm your password'
    else if (form.confirmPassword !== form.password) v.confirmPassword = 'Passwords do not match'
    return v
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const v = validate()
    setErrors(v)
    setFormError(null)
    if (Object.keys(v).length) return
    setBusy(true)
    try {
      const res = await signup({ ...form, username: form.username.trim(), email: form.email.trim() })
      toast.success(res.message)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const { message, details } = parseApiError(err)
      setErrors(details)
      setFormError(message)
    } finally {
      setBusy(false)
    }
  }

  const input = (id, props = {}) => (
    <input id={id} className={`input ${errors[id] ? 'input-error' : ''}`} value={form[id]} onChange={update(id)} aria-invalid={Boolean(errors[id])} {...props} />
  )

  return (
    <div>
      <h2 className="text-3xl font-semibold">Create your account</h2>
      <p className="mt-2 text-sm text-cream-500">Start tracking your journey from the Academy to Hokage.</p>

      {formError && (
        <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-leaf-500/40 bg-leaf-500/10 px-3.5 py-3 text-sm text-leaf-400" role="alert">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        <Field label="Username" htmlFor="username" error={errors.username} hint="3–30 characters: letters, numbers, . _ -">
          {input('username', { autoComplete: 'username', maxLength: 30 })}
        </Field>
        <Field label="Email" htmlFor="email" error={errors.email}>
          {input('email', { type: 'email', autoComplete: 'email' })}
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password}>
          {input('password', { type: 'password', autoComplete: 'new-password', maxLength: 128 })}
          <PasswordRules password={form.password} />
        </Field>
        <Field label="Confirm password" htmlFor="confirmPassword" error={errors.confirmPassword}>
          {input('confirmPassword', { type: 'password', autoComplete: 'new-password', maxLength: 128 })}
        </Field>
        <button type="submit" className="btn-primary w-full py-3" disabled={busy}>
          {busy ? <Spinner /> : <UserPlus className="size-4" />} Create account
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-cream-500">
        Already have an account?{' '}
        <Link to="/signin" className="font-semibold text-fox-400 hover:text-fox-300">
          Sign in
        </Link>
      </p>
    </div>
  )
}
