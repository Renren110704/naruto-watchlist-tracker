import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute, PublicOnlyRoute } from './components/RouteGuards'
import AppLayout from './layouts/AppLayout'
import AuthLayout from './layouts/AuthLayout'
import Browse from './pages/Browse'
import Dashboard from './pages/Dashboard'
import EpisodeDetails from './pages/EpisodeDetails'
import EpisodeNotesPage from './pages/EpisodeNotesPage'
import MyNotes from './pages/MyNotes'
import NotFound from './pages/NotFound'
import Profile from './pages/Profile'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import Tracker from './pages/Tracker'

export default function App() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route element={<AuthLayout />}>
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/tracker" element={<Tracker />} />
          <Route path="/notes" element={<MyNotes />} />
          <Route path="/episodes/:episodeId" element={<EpisodeDetails />} />
          <Route path="/episodes/:episodeId/notes" element={<EpisodeNotesPage />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
