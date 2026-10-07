// In-browser implementation of the API contract for VITE_USE_MOCK=true.
// It mirrors the backend's role filtering, validation and error codes so every
// screen and failure path can be exercised without a server.
//
// Transcript triggers (mock only):
//   TEST_ISSUES   -> draft comes back with two validation issues
//   TEST_AI_FAIL  -> 502 AI_FAILED

import { ApiError, handleUnauthorized, tokenStore } from './client'
import { MOCK_DRAFT, MOCK_PASSWORD, MOCK_USERS } from './mockData'

const DB_KEY = 'nw_mock_db_v1'
const TOKEN_PREFIX = 'mock.'

// ---------------------------------------------------------------- storage

let cachedDb = null

function seedDb() {
  const db = { projects: [], tasks: [] }
  insertDraft(db, MOCK_DRAFT)
  return db
}

function loadDb() {
  if (cachedDb) return cachedDb
  let stored = null
  try {
    stored = JSON.parse(localStorage.getItem(DB_KEY))
  } catch {
    /* corrupted or unavailable: reseed */
  }
  // Persist the seed straight away so ids stay stable across reloads.
  if (stored) cachedDb = stored
  else saveDb(seedDb())
  return cachedDb
}

function saveDb(db) {
  cachedDb = db
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db))
  } catch {
    /* in-memory only */
  }
}

let idCounter = 0
function newId(prefix) {
  idCounter += 1
  return `${prefix}_${Date.now().toString(36)}${idCounter.toString(36)}`
}

function insertDraft(db, draft) {
  return draft.projects.map((project) => {
    const projectId = newId('p')
    db.projects.push({
      id: projectId,
      name: project.name,
      clientName: project.clientName,
      description: project.description ?? '',
      managerId: project.managerId,
      deadline: project.deadline,
    })
    for (const task of project.tasks ?? []) {
      db.tasks.push({
        id: newId('t'),
        projectId,
        title: task.title,
        description: task.description ?? '',
        assigneeId: task.assigneeId,
        deadline: task.deadline,
        estimatedHours: Number(task.estimatedHours),
      })
    }
    return projectId
  })
}

// ---------------------------------------------------------------- helpers

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const latency = () => wait(250 + Math.random() * 300)
const clone = (value) => JSON.parse(JSON.stringify(value))

function fail(status, code, message, issues) {
  if (status === 401) handleUnauthorized()
  throw new ApiError({ status, code, message, issues })
}

function findUser(id) {
  return MOCK_USERS.find((user) => user.id === id) ?? null
}

function publicUser({ id, name, email, role, specialization }) {
  return { id, name, email, role, specialization }
}

function ref(id) {
  const user = findUser(id)
  return user ? { id: user.id, name: user.name } : null
}

function currentUser() {
  const token = tokenStore.get()
  const user = token?.startsWith(TOKEN_PREFIX) ? findUser(token.slice(TOKEN_PREFIX.length)) : null
  if (!user) fail(401, 'UNAUTHENTICATED', 'Please sign in')
  return user
}

function requireRole(user, role) {
  if (user.role !== role) fail(403, 'FORBIDDEN', 'You do not have access to this resource')
}

/** Tasks of a project the user may see, or null when the project is out of scope. */
function visibleTasks(db, user, project) {
  const tasks = db.tasks.filter((task) => task.projectId === project.id)
  if (user.role === 'ADMIN') return tasks
  if (user.role === 'MANAGER') return project.managerId === user.id ? tasks : null
  const mine = tasks.filter((task) => task.assigneeId === user.id)
  return mine.length ? mine : null
}

const byDeadline = (a, b) => a.deadline.localeCompare(b.deadline)
const sumHours = (tasks) => tasks.reduce((total, task) => total + task.estimatedHours, 0)

function projectSummary(project) {
  const { id, name, clientName, description, deadline } = project
  return { id, name, clientName, description, deadline, manager: ref(project.managerId) }
}

function taskView(task) {
  const { id, projectId, title, description, deadline, estimatedHours } = task
  return { id, projectId, title, description, assignee: ref(task.assigneeId), deadline, estimatedHours }
}

// ---------------------------------------------------------------- validation (contract section 9)

const isText = (value) => typeof value === 'string' && value.trim().length > 0

function isRealDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
}

function validateDraft(draft) {
  const issues = []
  const add = (path, message) => issues.push({ path, message })

  if (!Array.isArray(draft?.projects) || draft.projects.length === 0) {
    add('projects', 'The draft must contain at least one project.')
    return issues
  }

  draft.projects.forEach((project, p) => {
    const at = `projects[${p}]`
    if (!isText(project.name)) add(`${at}.name`, 'Project name is required.')
    if (!isText(project.clientName)) add(`${at}.clientName`, 'Client name is required.')
    const projectDateOk = isRealDate(project.deadline)
    if (!projectDateOk) add(`${at}.deadline`, 'Project deadline must be a valid date.')
    const manager = findUser(project.managerId)
    if (!project.managerId) add(`${at}.managerId`, 'Choose a project manager.')
    else if (!manager) add(`${at}.managerId`, `"${project.managerId}" is not an employee.`)
    else if (manager.role !== 'MANAGER') add(`${at}.managerId`, `${manager.name} is not a manager.`)

    ;(project.tasks ?? []).forEach((task, t) => {
      const taskAt = `${at}.tasks[${t}]`
      if (!isText(task.title)) add(`${taskAt}.title`, 'Task title is required.')
      const assignee = findUser(task.assigneeId)
      if (!task.assigneeId) add(`${taskAt}.assigneeId`, 'Choose a developer for this task.')
      else if (!assignee) add(`${taskAt}.assigneeId`, `"${task.assigneeId}" is not an employee.`)
      else if (assignee.role !== 'AGENT') add(`${taskAt}.assigneeId`, `${assignee.name} is not a developer.`)
      const hours = Number(task.estimatedHours)
      if (task.estimatedHours === null || task.estimatedHours === '' || !Number.isFinite(hours) || hours <= 0) {
        add(`${taskAt}.estimatedHours`, 'Estimated hours must be greater than 0.')
      }
      if (!isRealDate(task.deadline)) add(`${taskAt}.deadline`, 'Task deadline must be a valid date.')
      else if (projectDateOk && task.deadline > project.deadline) {
        add(`${taskAt}.deadline`, 'Task deadline is after the project deadline.')
      }
    })
  })

  return issues
}

// ---------------------------------------------------------------- endpoints

export async function login(email, password) {
  await latency()
  const user = MOCK_USERS.find((candidate) => candidate.email === String(email).trim().toLowerCase())
  if (!user || password !== MOCK_PASSWORD) {
    throw new ApiError({ status: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' })
  }
  return { token: `${TOKEN_PREFIX}${user.id}`, user: publicUser(user) }
}

export async function me() {
  await latency()
  return { user: publicUser(currentUser()) }
}

export async function getTeam() {
  await latency()
  currentUser()
  return { users: clone(MOCK_USERS) }
}

export async function getProjects() {
  await latency()
  const user = currentUser()
  const db = loadDb()
  const projects = []
  for (const project of db.projects) {
    const tasks = visibleTasks(db, user, project)
    if (tasks) projects.push({ ...projectSummary(project), taskCount: tasks.length, totalHours: sumHours(tasks) })
  }
  return { projects }
}

export async function getProject(id) {
  await latency()
  const user = currentUser()
  const db = loadDb()
  const project = db.projects.find((candidate) => candidate.id === id)
  if (!project) fail(404, 'NOT_FOUND', 'Project not found')
  const tasks = visibleTasks(db, user, project)
  if (!tasks) fail(403, 'FORBIDDEN', 'You do not have access to this project')
  return { project: projectSummary(project), tasks: [...tasks].sort(byDeadline).map(taskView) }
}

export async function getMyTasks() {
  await latency()
  const user = currentUser()
  requireRole(user, 'AGENT')
  const db = loadDb()
  const tasks = db.tasks
    .filter((task) => task.assigneeId === user.id)
    .sort(byDeadline)
    .map((task) => {
      const project = db.projects.find((candidate) => candidate.id === task.projectId)
      const { projectId: _projectId, ...rest } = taskView(task)
      return {
        ...rest,
        project: { id: project.id, name: project.name, clientName: project.clientName, manager: ref(project.managerId) },
      }
    })
  return { tasks, totalHours: sumHours(tasks) }
}

export async function createDraft(transcript) {
  const user = currentUser()
  requireRole(user, 'ADMIN')
  if (!isText(transcript)) fail(400, 'EMPTY_TRANSCRIPT', 'Paste a meeting transcript first')
  await wait(1500)
  if (transcript.includes('TEST_AI_FAIL')) {
    fail(502, 'AI_FAILED', 'The AI service did not return a usable draft')
  }

  const draft = clone(MOCK_DRAFT)
  if (transcript.includes('TEST_ISSUES')) {
    // An unresolved person and a task that runs past its project's deadline.
    draft.projects[0].tasks[2].assigneeId = null
    draft.projects[1].tasks[3].deadline = '2026-10-27'
  }
  return { draft, issues: validateDraft(draft) }
}

let committing = false

export async function commitDraft(draft) {
  const user = currentUser()
  requireRole(user, 'ADMIN')
  if (committing) fail(409, 'BUSY', 'Another save is in progress')
  committing = true
  try {
    await wait(700)
    const issues = validateDraft(draft)
    if (issues.length) fail(422, 'VALIDATION_FAILED', 'The draft has validation issues', issues)

    const db = clone(loadDb())
    const ids = insertDraft(db, draft)
    saveDb(db)

    const projects = ids.map((id) => {
      const project = db.projects.find((candidate) => candidate.id === id)
      const tasks = db.tasks.filter((task) => task.projectId === id)
      const { name, clientName, managerId, deadline } = project
      return { id, name, clientName, managerId, deadline, taskCount: tasks.length, totalHours: sumHours(tasks) }
    })
    return {
      projects,
      totals: {
        projects: projects.length,
        tasks: projects.reduce((total, project) => total + project.taskCount, 0),
        hours: projects.reduce((total, project) => total + project.totalHours, 0),
      },
    }
  } finally {
    committing = false
  }
}
