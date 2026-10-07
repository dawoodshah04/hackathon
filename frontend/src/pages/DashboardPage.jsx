import { FileText, FolderOpen } from 'lucide-react'
import { getProjects } from '../api'
import { ButtonLink } from '../components/Button'
import EmptyState from '../components/EmptyState'
import ErrorBanner from '../components/ErrorBanner'
import PageHeader from '../components/PageHeader'
import ProjectCard, { ProjectCardSkeleton } from '../components/ProjectCard'
import Skeleton, { SkeletonGroup } from '../components/Skeleton'
import StatStrip from '../components/StatStrip'
import { useAuth } from '../context/AuthContext'
import { formatHours, sumBy } from '../lib/format'
import { useAsync } from '../lib/useAsync'
import { useDocumentTitle } from '../lib/useDocumentTitle'

function CreateFromTranscriptButton() {
  return (
    <ButtonLink to="/transcript">
      <FileText className="size-4" aria-hidden="true" />
      Create from Transcript
    </ButtonLink>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const isAdmin = user.role === 'ADMIN'
  useDocumentTitle(isAdmin ? 'Projects' : 'My projects')
  const { data, error, loading, reload } = useAsync(getProjects, [user.id])
  const projects = data?.projects ?? []

  return (
    <div className="space-y-8">
      <PageHeader
        title={isAdmin ? 'Projects' : 'My projects'}
        description={
          isAdmin
            ? 'Every active project at NovaWorks, with its manager, deadline and estimated effort.'
            : 'Projects you manage and the work planned for each of them.'
        }
        actions={isAdmin && <CreateFromTranscriptButton />}
      />

      {loading && (
        <SkeletonGroup label="Loading projects" className="space-y-8">
          <Skeleton className="h-[74px] rounded-xl" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ProjectCardSkeleton />
            <ProjectCardSkeleton />
            <ProjectCardSkeleton />
          </div>
        </SkeletonGroup>
      )}

      {error && <ErrorBanner title="Couldn't load projects" error={error} onRetry={reload} />}

      {data && projects.length === 0 && (
        <EmptyState
          icon={isAdmin ? FileText : FolderOpen}
          title="No projects yet"
          description={
            isAdmin
              ? 'Paste a meeting transcript to create your first projects.'
              : 'Projects you manage will appear here once they are created.'
          }
          action={isAdmin && <CreateFromTranscriptButton />}
        />
      )}

      {data && projects.length > 0 && (
        <>
          <StatStrip
            items={[
              { label: 'Projects', value: projects.length },
              { label: 'Tasks', value: sumBy(projects, 'taskCount') },
              { label: 'Estimated effort', value: formatHours(sumBy(projects, 'totalHours')) },
            ]}
          />
          <section aria-label="Projects">
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <li key={project.id} className="flex">
                  <ProjectCard project={project} />
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  )
}
