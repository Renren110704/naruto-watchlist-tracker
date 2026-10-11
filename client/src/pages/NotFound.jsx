import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function NotFound({ message = "This path leads nowhere — even with the Byakugan." }) {
  const { user } = useAuth()
  return (
    <div className="grid min-h-[60dvh] place-items-center px-4 py-16 text-center">
      <div className="max-w-md animate-slide-up">
        <p className="font-display text-7xl font-semibold text-fox-500/80">404</p>
        <h1 className="mt-4 text-2xl font-semibold">Page not found</h1>
        <p className="mt-2 text-cream-500">{message}</p>
        <Link to={user ? '/dashboard' : '/signin'} className="btn-primary mt-8">
          <Compass className="size-4" /> {user ? 'Back to dashboard' : 'Go to sign in'}
        </Link>
      </div>
    </div>
  )
}
