import { LOGIN_PATH, http } from './client'

// Thin wrappers over the HTTP contract (docs: SHARED CONTEXT section 7).
// Each function resolves with the response body exactly as the API returns it.

// The AI step can legitimately take a while (model fallbacks, retries).
const TRANSCRIPT_TIMEOUT_MS = 150_000

export async function login(email, password) {
  const { data } = await http.post(LOGIN_PATH, { email, password })
  return data
}

export async function me() {
  const { data } = await http.get('/api/auth/me')
  return data
}

export async function getTeam() {
  const { data } = await http.get('/api/team')
  return data
}

export async function getProjects() {
  const { data } = await http.get('/api/projects')
  return data
}

export async function getProject(id) {
  const { data } = await http.get(`/api/projects/${encodeURIComponent(id)}`)
  return data
}

export async function getMyTasks() {
  const { data } = await http.get('/api/tasks/mine')
  return data
}

export async function createDraft(transcript) {
  const { data } = await http.post('/api/transcripts/draft', { transcript }, { timeout: TRANSCRIPT_TIMEOUT_MS })
  return data
}

export async function commitDraft(draft) {
  const { data } = await http.post('/api/transcripts/commit', { draft }, { timeout: TRANSCRIPT_TIMEOUT_MS })
  return data
}
