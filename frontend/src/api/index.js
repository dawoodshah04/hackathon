import * as mockApi from './mock'
import * as realApi from './real'

export { ApiError } from './client'

// Vite inlines this at build time, so a production build with VITE_USE_MOCK
// unset tree-shakes the mock module (and its fixtures) out of the bundle.
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

const api = USE_MOCK ? mockApi : realApi

export const { login, me, getTeam, getProjects, getProject, getMyTasks, getInsights, createDraft, commitDraft } = api
