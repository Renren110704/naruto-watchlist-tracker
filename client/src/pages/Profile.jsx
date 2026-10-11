import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound, Save, Settings2, ShieldAlert, UserRound } from 'lucide-react'
import { Field, PageHeader } from '../components/Controls'
import { Modal } from '../components/Modal'
import { Spinner } from '../components/States'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { parseApiError } from '../services/api'
import { authApi } from '../services/endpoints'
import { formatDate } from '../utils/format'
import { validatePassword, validateUsername } from '../utils/validation'

function Panel({ icon: Icon, title, description, children, tone = 'fox' }) {
  return (
    <section className={`card p-5 sm:p-6 ${tone === 'danger' ? 'border-leaf-500/30' : ''}`}>
      <div className="mb-5 flex items-start gap-3">
        <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${tone === 'danger' ? 'bg-leaf-500/12 text-leaf-400' : 'bg-fox-500/12 text-fox-400'}`}>
          <Icon className="size-[18px]" />
        </span>
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-cream-500">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

function ProfileForm() {
  const { user, setUser } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState({ username: user.username, email: user.email })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const dirty = form.username.trim() !== user.username || form.email.trim().toLowerCase() !== user.email

  async function submit(e) {
    e.preventDefault()
    const v = {}
    const u = validateUsername(form.username.trim())
    if (u) v.username = u
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) v.email = 'Enter a valid email address'
    setErrors(v)
    if (Object.keys(v).length) return
    setBusy(true)
    try {
      const res = await authApi.updateProfile({ username: form.username.trim(), email: form.email.trim() })
      setUser(res.user)
      toast.success(res.message)
    } catch (err) {
      const { message, details } = parseApiError(err)
      setErrors(details)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
      <Field label="Username" htmlFor="p-username" error={errors.username}>
        <input id="p-username" className={`input ${errors.username ? 'input-error' : ''}`} value={form.username} maxLength={30} onChange={(e) => setForm({ ...form, username: e.target.value })} autoComplete="username" />
      </Field>
      <Field label="Email" htmlFor="p-email" error={errors.email}>
        <input id="p-email" type="email" className={`input ${errors.email ? 'input-error' : ''}`} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
      </Field>
      <div className="flex items-center justify-between gap-3 sm:col-span-2">
        <p className="text-xs text-cream-500">Member since {formatDate(user.createdAt)}</p>
        <button className="btn-primary" disabled={busy || !dirty}>
          {busy ? <Spinner /> : <Save className="size-4" />} Save profile
        </button>
      </div>
    </form>
  )
}

function Preferences() {
  const { user, setUser } = useAuth()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const on = user.preferences?.includeSpecials ?? true

  async function toggle() {
    setBusy(true)
    try {
      const res = await authApi.updateProfile({ preferences: { includeSpecials: !on } })
      setUser(res.user)
      toast.success(!on ? 'Movies & OVAs will appear in Continue Watching' : 'Continue Watching will skip movies & OVAs')
    } catch (err) {
      toast.error(parseApiError(err).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="font-medium text-cream-100">Include movies & OVAs in Continue Watching</p>
        <p className="mt-0.5 text-sm text-cream-500">When off, &ldquo;up next&rdquo; jumps straight to the next numbered episode.</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="Include movies and OVAs in Continue Watching"
        onClick={toggle}
        disabled={busy}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? 'bg-fox-500' : 'bg-ink-600'} disabled:opacity-60`}
      >
        <span className={`absolute top-1 size-5 rounded-full bg-cream-50 shadow transition-all ${on ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  )
}

function PasswordForm() {
  const toast = useToast()
  const empty = { currentPassword: '', newPassword: '', confirmPassword: '' }
  const [form, setForm] = useState(empty)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    const v = {}
    if (!form.currentPassword) v.currentPassword = 'Current password is required'
    const p = validatePassword(form.newPassword)
    if (p) v.newPassword = p
    if (form.confirmPassword !== form.newPassword) v.confirmPassword = 'Passwords do not match'
    setErrors(v)
    if (Object.keys(v).length) return
    setBusy(true)
    try {
      const res = await authApi.changePassword(form)
      setForm(empty)
      toast.success(res.message)
    } catch (err) {
      const { message, details } = parseApiError(err)
      setErrors(details)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  const input = (id, label, autoComplete) => (
    <Field label={label} htmlFor={`pw-${id}`} error={errors[id]}>
      <input id={`pw-${id}`} type="password" className={`input ${errors[id] ? 'input-error' : ''}`} value={form[id]} maxLength={128} autoComplete={autoComplete} onChange={(e) => setForm({ ...form, [id]: e.target.value })} />
    </Field>
  )

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-3">
      {input('currentPassword', 'Current password', 'current-password')}
      {input('newPassword', 'New password', 'new-password')}
      {input('confirmPassword', 'Confirm new password', 'new-password')}
      <div className="flex justify-end sm:col-span-3">
        <button className="btn-secondary" disabled={busy}>
          {busy ? <Spinner /> : <KeyRound className="size-4" />} Change password
        </button>
      </div>
    </form>
  )
}

function DeleteAccount() {
  const { setUser } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function confirm(e) {
    e.preventDefault()
    if (!password) return setError('Enter your password to confirm')
    setBusy(true)
    try {
      const res = await authApi.deleteAccount(password)
      toast.info(res.message)
      setUser(null)
      navigate('/signup', { replace: true })
    } catch (err) {
      const { message, details } = parseApiError(err)
      setError(details.password || message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-cream-300">Permanently delete your account, watch progress and every note. This cannot be undone.</p>
        <button className="btn-danger shrink-0" onClick={() => setOpen(true)}>
          Delete account
        </button>
      </div>
      <Modal open={open} onClose={() => !busy && setOpen(false)} title="Delete your account?" size="sm" dismissible={!busy}>
        <form onSubmit={confirm} noValidate className="space-y-4">
          <p className="text-sm text-cream-300">All of your progress and notes will be erased. Enter your password to confirm.</p>
          <Field label="Password" htmlFor="del-pw" error={error}>
            <input id="del-pw" type="password" className={`input ${error ? 'input-error' : ''}`} value={password} autoComplete="current-password" onChange={(e) => { setPassword(e.target.value); setError(null) }} />
          </Field>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </button>
            <button className="btn-danger" disabled={busy}>
              {busy && <Spinner />} Delete forever
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}

export default function Profile() {
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Account" title="Profile & Settings" />
      <Panel icon={UserRound} title="Profile" description="How you appear in the app.">
        <ProfileForm />
      </Panel>
      <Panel icon={Settings2} title="Preferences">
        <Preferences />
      </Panel>
      <Panel icon={KeyRound} title="Password" description="Changing your password signs out your other sessions.">
        <PasswordForm />
      </Panel>
      <Panel icon={ShieldAlert} title="Danger zone" tone="danger">
        <DeleteAccount />
      </Panel>
    </div>
  )
}
