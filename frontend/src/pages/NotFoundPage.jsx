import { ButtonLink } from '../components/Button'
import { useAuth } from '../context/AuthContext'
import { homePathFor } from '../lib/roles'
import { useDocumentTitle } from '../lib/useDocumentTitle'

export default function NotFoundPage() {
  useDocumentTitle('Page not found')
  const { user } = useAuth()

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="font-mono text-sm text-brand-700">404</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 text-sm text-stone-600">The page you were looking for doesn&apos;t exist or has moved.</p>
      <ButtonLink to={homePathFor(user?.role)} variant="secondary" className="mt-8">
        Back to home
      </ButtonLink>
    </div>
  )
}
