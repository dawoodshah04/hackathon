import * as realApi from './real'

export { ApiError } from './client'

export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

const api = realApi

export const { login, me, getTeam, getProjects, getProject, getMyTasks, createDraft, commitDraft } = api
