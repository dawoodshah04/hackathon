import { ArrowRight, Clock } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import Avatar from '../components/Avatar'
import Button from '../components/Button'
import ErrorBanner from '../components/ErrorBanner'
import { Input, Label } from '../components/Field'
import Logo from '../components/Logo'
import { useAuth } from '../context/AuthContext'
import { cx } from '../lib/cx'
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '../lib/demoAccounts'
import { homePathFor } from '../lib/roles'
import { useDocumentTitle } from '../lib/useDocumentTitle'

const STEPS = [
  { title: 'Paste the meeting transcript', body: 'Late corrections in the conversation are respected; the final recap wins.' },
  { title: 'Review the draft', body: 'Nothing is saved until every project and task passes validation.' },
  { title: 'Everyone sees their part', body: 'Managers see their projects. Developers see only their own tasks.' },
]

const ACCOUNT_GROUPS = [
  { label: 'Admin', role: 'ADMIN' },
  { label: 'Managers', role: 'MANAGER' },
  { label: 'Developers', role: 'AGENT' },
]

function describeLoginError(error) {
  if (!error) return null
  if (error.code === 'INVALID_CREDENTIALS' || error.status === 401) return 'Email or password is incorrect.'
  if (error.code === 'NETWORK') return 'Cannot reach the server. Check your connection and try again.'
  return error.message
}

export default function LoginPage() {
  useDocumentTitle('Sign in')
  const { user, signIn, sessionExpired } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [pending, setPending] = useState(null) // "form" | demo account id | null

  if (user && !pending) return <Navigate to={homePathFor(user.role)} replace />

  async function authenticate(credentials, source) {
    if (pending) return
    setPending(source)
    setError(null)
    try {
      const signedIn = await signIn(credentials.email.trim(), credentials.password)
      navigate(homePathFor(signedIn.role), { replace: true })
    } catch (err) {
      setError(err)
      setPending(null)
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    authenticate({ email, password }, 'form')
  }

  function signInAs(account) {
    setEmail(account.email)
    setPassword(DEMO_PASSWORD)
    authenticate({ email: account.email, password: DEMO_PASSWORD }, account.id)
  }

  return (
    <div className="flex min-h-dvh">
      <aside className="relative hidden w-[42%] max-w-xl flex-col justify-between overflow-hidden bg-brand-950 p-10 text-brand-50 lg:flex xl:p-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:40px_40px]"
        />
        <Logo inverted className="relative" />
        <div className="relative">
          <h1 className="max-w-sm text-3xl leading-tight font-semibold tracking-tight text-white xl:text-[2.125rem]">
            From meeting notes to assigned work.
          </h1>
          <ol className="mt-10 space-y-6">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-4">
                <span className="grid size-7 shrink-0 place-items-center rounded-full border border-brand-700 font-mono text-xs text-brand-200">
                  {index + 1}
                </span>
                <div>
                  <p className="font-medium text-white">{step.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-brand-200/90">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <p className="relative text-xs text-brand-300/80">NovaWorks Technologies · Lahore</p>
      </aside>

      <main className="flex flex-1 items-start justify-center px-4 py-10 sm:items-center sm:px-6">
        <div className="w-full max-w-sm">
          <Logo className="mb-10 lg:hidden" />
          <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
          <p className="mt-1.5 text-sm text-stone-600">Use your NovaWorks account to continue.</p>

          {sessionExpired && !error && (
            <div className="mt-6 flex items-center gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-900">
              <Clock className="size-4 shrink-0" aria-hidden="true" />
              Your session ended. Please sign in again.
            </div>
          )}
          {error && <ErrorBanner className="mt-6" message={describeLoginError(error)} />}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@novaworks.example"
                invalid={Boolean(error && error.status === 401)}
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                invalid={Boolean(error && error.status === 401)}
              />
            </div>
            <Button type="submit" size="lg" className="w-full" loading={pending === 'form'} disabled={Boolean(pending)}>
              Sign in
            </Button>
          </form>

          <section aria-labelledby="demo-accounts" className="mt-10">
            <div className="flex items-center gap-3">
              <h3 id="demo-accounts" className="text-xs font-medium tracking-wide text-stone-500 uppercase">
                Demo accounts
              </h3>
              <span className="h-px flex-1 bg-stone-200" />
            </div>
            <p className="mt-2 text-xs text-stone-500">
              One click signs in. Shared password <span className="font-mono text-stone-700">{DEMO_PASSWORD}</span>
            </p>

            <div className="mt-4 space-y-4">
              {ACCOUNT_GROUPS.map((group) => (
                <div key={group.role}>
                  <p className="mb-1.5 text-[11px] font-medium text-stone-400">{group.label}</p>
                  <ul className={cx('grid gap-1.5', group.role !== 'ADMIN' && 'sm:grid-cols-2')}>
                    {DEMO_ACCOUNTS.filter((account) => account.role === group.role).map((account) => (
                      <li key={account.id}>
                        <button
                          type="button"
                          onClick={() => signInAs(account)}
                          disabled={Boolean(pending)}
                          className="focus-ring group flex w-full items-center gap-2.5 rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-left transition-colors hover:border-stone-300 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Avatar id={account.id} name={account.name} size="sm" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-medium text-stone-800">{account.name}</span>
                            <span className="block truncate text-xs text-stone-500">{account.specialization}</span>
                          </span>
                          {pending === account.id ? (
                            <span className="size-3.5 animate-spin rounded-full border-2 border-stone-300 border-t-brand-700" />
                          ) : (
                            <ArrowRight
                              className="size-3.5 text-stone-300 transition-colors group-hover:text-stone-500"
                              aria-hidden="true"
                            />
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
