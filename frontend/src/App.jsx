import { WifiOff } from 'lucide-react'
import { Suspense, lazy, useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import Button from './components/Button'
import Layout from './components/Layout'
import Logo from './components/Logo'
import ProtectedRoute from './components/ProtectedRoute'
import { FullPageSpinner } from './components/Spinner'
import { useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'

// Each page is its own download, so the first visit only fetches what it shows.
const pages = {
  dashboard: () => import('./pages/DashboardPage'),
  project: () => import('./pages/ProjectDetailPage'),
  myTasks: () => import('./pages/MyTasksPage'),
  team: () => import('./pages/TeamPage'),
  transcript: () => import('./pages/TranscriptPage'),
}
const DashboardPage = lazy(pages.dashboard)
const ProjectDetailPage = lazy(pages.project)
const MyTasksPage = lazy(pages.myTasks)
const TeamPage = lazy(pages.team)
const TranscriptPage = lazy(pages.transcript)

/** Once signed in and idle, fetch the other pages in the background so navigation is instant. */
function usePreloadPages(enabled) {
  useEffect(() => {
    if (!enabled) return undefined
    const preload = () => Object.values(pages).forEach((load) => load().catch(() => {}))
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(preload, { timeout: 4000 })
      return () => window.cancelIdleCallback(id)
    }
    const id = setTimeout(preload, 2000)
    return () => clearTimeout(id)
  }, [enabled])
}

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
  usePreloadPages(status === 'authenticated')

  if (status === 'checking') return <FullPageSpinner label="Restoring your session" />
  if (status === 'unreachable') return <ServerUnreachable />

  return (
    <Suspense fallback={<FullPageSpinner label="Loading" />}>
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
    </Suspense>
  )
}
