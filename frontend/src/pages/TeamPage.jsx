import { Mail } from 'lucide-react'
import { getTeam } from '../api'
import Avatar from '../components/Avatar'
import Badge, { RoleBadge } from '../components/Badge'
import ErrorBanner from '../components/ErrorBanner'
import PageHeader from '../components/PageHeader'
import Skeleton, { SkeletonGroup } from '../components/Skeleton'
import { useAuth } from '../context/AuthContext'
import { cx } from '../lib/cx'
import { useAsync } from '../lib/useAsync'
import { useDocumentTitle } from '../lib/useDocumentTitle'

const SECTIONS = [
  { role: 'ADMIN', title: 'Administration' },
  { role: 'MANAGER', title: 'Project managers' },
  { role: 'AGENT', title: 'Developers' },
]

function MemberCard({ member, isYou }) {
  return (
    <article
      className={cx(
        'flex h-full flex-col rounded-xl border bg-white p-5 shadow-xs',
        isYou ? 'border-brand-300 ring-1 ring-brand-200' : 'border-stone-200',
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar id={member.id} name={member.name} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-[15px] font-semibold tracking-tight">{member.name}</h3>
            {isYou && <Badge tone="brand">You</Badge>}
          </div>
          <p className="mt-0.5 truncate text-sm text-stone-600">{member.specialization}</p>
        </div>
        <RoleBadge role={member.role} />
      </div>
      {member.skills?.length > 0 && (
        <ul aria-label="Skills" className="mt-4 flex flex-wrap gap-1.5">
          {member.skills.map((skill) => (
            <li key={skill} className="rounded-md bg-stone-100 px-2 py-0.5 text-xs text-stone-700">
              {skill}
            </li>
          ))}
        </ul>
      )}
      {member.email && (
        <a
          href={`mailto:${member.email}`}
          className="focus-ring mt-auto inline-flex items-center gap-1.5 self-start rounded-sm pt-4 text-xs text-stone-500 hover:text-brand-800"
        >
          <Mail className="size-3.5" aria-hidden="true" />
          {member.email}
        </a>
      )}
    </article>
  )
}

export default function TeamPage() {
  useDocumentTitle('Team')
  const { user } = useAuth()
  const { data, error, loading, reload } = useAsync(getTeam, [user.id])
  const users = data?.users ?? []

  return (
    <div className="space-y-10">
      <PageHeader title="Team" description="Who works at NovaWorks and what they specialise in." />

      {loading && (
        <SkeletonGroup label="Loading team" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-36 rounded-xl" />
          ))}
        </SkeletonGroup>
      )}

      {error && <ErrorBanner title="Couldn't load the team" error={error} onRetry={reload} />}

      {SECTIONS.map((section) => {
        const members = users.filter((member) => member.role === section.role)
        if (members.length === 0) return null
        return (
          <section key={section.role} aria-labelledby={`team-${section.role}`}>
            <h2 id={`team-${section.role}`} className="mb-3 flex items-baseline gap-2 text-sm font-semibold text-stone-900">
              {section.title}
              <span className="font-normal text-stone-400 tabular-nums">{members.length}</span>
            </h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {members.map((member) => (
                <li key={member.id}>
                  <MemberCard member={member} isYou={member.id === user.id} />
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
