import { Navigate, Route, Routes } from 'react-router-dom'
import { FullPageSpinner } from './components/Spinner'
import { useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'

export default function App() {
  const { status } = useAuth()
  if (status === 'checking') return <FullPageSpinner label="Restoring your session" />

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
