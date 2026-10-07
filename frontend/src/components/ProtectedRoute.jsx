import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { homePathFor } from '../lib/roles'

/**
 * Gates a route on being signed in and, optionally, on role.
 * This is a UX convenience only: the API enforces access on every request.
 */
export default function ProtectedRoute({ roles, children }) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (roles && !roles.includes(user.role)) return <Navigate to={homePathFor(user.role)} replace />

  return children ?? <Outlet />
}
