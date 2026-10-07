export const ROLES = Object.freeze({ ADMIN: 'ADMIN', MANAGER: 'MANAGER', AGENT: 'AGENT' })

export const ROLE_LABELS = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  AGENT: 'Developer',
}

/** Where each role lands after signing in. */
export function homePathFor(role) {
  return role === ROLES.AGENT ? '/my-tasks' : '/'
}
