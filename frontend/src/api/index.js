import * as realApi from './real'

export { ApiError } from './client'

const api = realApi

export const { login, me, getTeam, getProjects, getProject, getMyTasks, createDraft, commitDraft } = api
