import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LeafMark } from './Logo'
import { Spinner } from './States'

function FullScreenLoader() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <div className="flex flex-col items-center gap-4 text-cream-500">
        <LeafMark className="size-12 animate-pulse" />
        <Spinner className="size-5 text-fox-500" />
      </div>
    </div>
  )
}

export function ProtectedRoute() {
  const { user, status } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <FullScreenLoader />
  if (!user) return <Navigate to="/signin" replace state={{ from: location }} />
  return <Outlet />
}

export function PublicOnlyRoute() {
  const { user, status } = useAuth()
  if (status === 'loading') return <FullScreenLoader />
  if (user) return <Navigate to="/dashboard" replace />
  return <Outlet />
}
