import { FileText, FolderKanban, ListChecks, LogOut, Menu, Users, X } from 'lucide-react'
import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { USE_MOCK } from '../api'
import { useAuth } from '../context/AuthContext'
import { cx } from '../lib/cx'
import Avatar from './Avatar'
import Badge, { RoleBadge } from './Badge'
import Logo from './Logo'

// Hiding links is only for clarity; the API decides what each role can read.
const LINKS = {
  ADMIN: [
    { to: '/', label: 'Projects', icon: FolderKanban, end: true },
    { to: '/team', label: 'Team', icon: Users },
    { to: '/transcript', label: 'Create from Transcript', icon: FileText },
  ],
  MANAGER: [
    { to: '/', label: 'My Projects', icon: FolderKanban, end: true },
    { to: '/team', label: 'Team', icon: Users },
  ],
  AGENT: [
    { to: '/my-tasks', label: 'My Tasks', icon: ListChecks },
    { to: '/team', label: 'Team', icon: Users },
  ],
}

export default function Navbar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const links = LINKS[user.role] ?? []

  function handleSignOut() {
    setMenuOpen(false)
    signOut()
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-8 px-4 sm:px-6 lg:px-8">
        <NavLink to={links[0]?.to ?? '/'} className="focus-ring rounded-md" aria-label="NovaWorks Projects home">
          <Logo />
        </NavLink>

        <nav aria-label="Main" className="hidden h-full items-stretch gap-6 md:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                cx(
                  'focus-ring relative inline-flex items-center rounded-sm text-sm transition-colors',
                  'after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full',
                  isActive
                    ? 'font-medium text-stone-900 after:bg-brand-700'
                    : 'text-stone-500 after:bg-transparent hover:text-stone-900',
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {USE_MOCK && (
            <Badge tone="amber" className="hidden sm:inline-flex" title="VITE_USE_MOCK=true: data comes from the in-browser mock API">
              Mock data
            </Badge>
          )}
          <div className="hidden items-center gap-2.5 md:flex">
            <Avatar id={user.id} name={user.name} size="sm" />
            <div className="leading-tight">
              <p className="text-[13px] font-medium text-stone-900">{user.name}</p>
              <RoleBadge role={user.role} className="mt-0.5 !px-1 !py-0 text-[10px]" />
            </div>
          </div>
          <span className="hidden h-6 w-px bg-stone-200 md:block" aria-hidden="true" />
          <button
            type="button"
            onClick={handleSignOut}
            className="focus-ring hidden items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] text-stone-600 hover:bg-stone-100 hover:text-stone-900 md:inline-flex"
          >
            <LogOut className="size-4" aria-hidden="true" />
            Sign out
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            className="focus-ring -mr-1.5 rounded-md p-1.5 text-stone-600 hover:bg-stone-100 md:hidden"
          >
            {menuOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
            <span className="sr-only">{menuOpen ? 'Close menu' : 'Open menu'}</span>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div id="mobile-menu" className="border-t border-stone-200 bg-white px-4 pt-3 pb-4 md:hidden">
          <div className="flex items-center gap-3 px-2 pb-3">
            <Avatar id={user.id} name={user.name} size="md" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-stone-500">{user.email}</p>
            </div>
            <RoleBadge role={user.role} className="ml-auto" />
          </div>
          <nav aria-label="Main" className="space-y-0.5 border-t border-stone-100 pt-2">
            {links.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  cx(
                    'focus-ring flex items-center gap-3 rounded-md px-2 py-2 text-sm',
                    isActive ? 'bg-brand-50 font-medium text-brand-800' : 'text-stone-700 hover:bg-stone-50',
                  )
                }
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={handleSignOut}
              className="focus-ring flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm text-stone-700 hover:bg-stone-50"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Sign out
            </button>
          </nav>
        </div>
      )}
    </header>
  )
}
