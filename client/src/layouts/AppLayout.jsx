import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BarChart3, Clapperboard, LayoutDashboard, LogOut, Menu, NotebookText, UserRound, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Logo } from '../components/Logo'
import { ConfirmDialog } from '../components/Modal'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/browse', label: 'Browse Episodes', icon: Clapperboard },
  { to: '/tracker', label: 'My Tracker', icon: BarChart3 },
  { to: '/notes', label: 'My Notes', icon: NotebookText },
  { to: '/profile', label: 'Profile', icon: UserRound },
]

function NavItems({ onNavigate }) {
  return (
    <ul className="space-y-1">
      {NAV.map(({ to, label, icon: Icon }) => (
        <li key={to}>
          <NavLink
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-fox-500/12 text-fox-300 shadow-[inset_3px_0_0_var(--color-fox-500)]'
                  : 'text-cream-300 hover:bg-ink-800 hover:text-cream-50'
              }`
            }
          >
            <Icon className="size-[18px] shrink-0" />
            {label}
          </NavLink>
        </li>
      ))}
    </ul>
  )
}

function UserFooter({ onLogout }) {
  const { user } = useAuth()
  return (
    <div className="border-t border-ink-700/70 pt-4">
      <div className="mb-3 flex items-center gap-3 px-1">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-fox-500 to-leaf-500 font-display text-sm font-semibold text-ink-950">
          {user?.username?.[0]?.toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-cream-50">{user?.username}</p>
          <p className="truncate text-xs text-cream-500">{user?.email}</p>
        </div>
      </div>
      <button onClick={onLogout} className="btn-ghost w-full justify-start px-3">
        <LogOut className="size-[18px]" /> Logout
      </button>
    </div>
  )
}

export default function AppLayout() {
  const { logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  // Scroll to top on page change.
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  // Close the mobile drawer first so the confirmation is the only layer open.
  function requestLogout() {
    setOpen(false)
    setConfirmLogout(true)
  }

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await logout()
      setConfirmLogout(false)
      toast.info('You have been signed out. See you soon!')
      navigate('/signin', { replace: true })
    } catch {
      toast.error('Could not sign you out. Please try again.')
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-ink-700/70 bg-ink-900/90 px-4 py-6 backdrop-blur lg:flex">
        <div className="mb-8 px-2">
          <Logo />
        </div>
        <nav aria-label="Main" className="flex-1">
          <NavItems />
        </nav>
        <UserFooter onLogout={requestLogout} />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-ink-700/70 bg-ink-900/85 px-4 py-3 backdrop-blur lg:hidden">
        <Logo />
        <button onClick={() => setOpen(true)} className="btn-ghost p-2" aria-label="Open navigation menu" aria-expanded={open}>
          <Menu className="size-5" />
        </button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-ink-950/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 right-0 flex w-72 max-w-[85vw] animate-slide-up flex-col border-l border-ink-700 bg-ink-900 px-4 py-5">
            <div className="mb-6 flex items-center justify-between px-2">
              <Logo />
              <button onClick={() => setOpen(false)} className="btn-ghost p-2" aria-label="Close navigation menu">
                <X className="size-5" />
              </button>
            </div>
            <nav aria-label="Main" className="flex-1">
              <NavItems onNavigate={() => setOpen(false)} />
            </nav>
            <UserFooter onLogout={requestLogout} />
          </aside>
        </div>
      )}

      <ConfirmDialog
        open={confirmLogout}
        title="Log out?"
        confirmLabel="Log out"
        busy={loggingOut}
        onCancel={() => setConfirmLogout(false)}
        onConfirm={handleLogout}
      >
        You&apos;ll need to sign in again to see your progress and notes.
      </ConfirmDialog>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
        <Outlet />
      </main>
    </div>
  )
}
