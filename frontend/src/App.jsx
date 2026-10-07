import { WifiOff } from 'lucide-react'
import { Route, Routes } from 'react-router-dom'
import Button from './components/Button'
import Layout from './components/Layout'
import Logo from './components/Logo'
import ProtectedRoute from './components/ProtectedRoute'
import { FullPageSpinner } from './components/Spinner'
import { useAuth } from './context/AuthContext'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import MyTasksPage from './pages/MyTasksPage'
import NotFoundPage from './pages/NotFoundPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import TeamPage from './pages/TeamPage'
import TranscriptPage from './pages/TranscriptPage'

function ServerUnreachable() {
  const { retry, signOut } = useAuth()
  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-sm text-center">
        <Logo withWordmark={false} className="justify-center" />
        <div className="mx-auto mt-8 grid size-10 place-items-center rounded-full bg-stone-100 text-stone-500">
          <WifiOff className="size-5" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-lg font-semibold">Cannot reach the server</h1>
        <p className="mt-1.5 text-sm text-stone-600">
          We couldn&apos;t confirm your session. Check your connection, then try again.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button onClick={retry}>Try again</Button>
          <Button variant="secondary" onClick={signOut}>
            Sign in again
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const { status } = useAuth()

  if (status === 'checking') return <FullPageSpinner label="Restoring your session" />
  if (status === 'unreachable') return <ServerUnreachable />

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route
          index
          element={
            <ProtectedRoute roles={['ADMIN', 'MANAGER']}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route path="projects/:id" element={<ProjectDetailPage />} />
        <Route
          path="my-tasks"
          element={
            <ProtectedRoute roles={['AGENT']}>
              <MyTasksPage />
            </ProtectedRoute>
          }
        />
        <Route path="team" element={<TeamPage />} />
        <Route
          path="transcript"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <TranscriptPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
