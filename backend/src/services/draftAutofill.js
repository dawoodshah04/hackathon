'use strict';

/**
 * Fills every field the AI left empty or got wrong, so a transcript always
 * becomes a complete, valid draft without manual input.
 *
 * Rules (applied only where the AI gave nothing usable):
 *  - clientName  -> the project name
 *  - managerId   -> the manager whose specialization/skills best match the project,
 *                   ties broken by fewest projects already managed
 *  - assigneeId  -> the developer whose skills best match the task,
 *                   ties broken by lowest current workload (hours)
 *  - estimatedHours -> 8
 *  - project deadline -> latest task deadline, else meeting date + 4 weeks
 *  - task deadline -> project deadline; never later than the project deadline
 */

const DEFAULT_HOURS = 8;
const DEFAULT_PROJECT_WEEKS = 4;

function isRealDate(str) {
  if (typeof str !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const d = new Date(`${str}T00:00:00.000Z`);
  return !isNaN(d.getTime()) && d.toISOString().startsWith(str);
}

function addDays(iso, days) {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const STOP = new Set(['the', 'and', 'for', 'with', 'of', 'to', 'a', 'an', 'in', 'on', 'app', 'project', 'task']);
function words(text) {
  return String(text || '')
    .toLowerCase()
    .split(/[^a-z0-9.+#]+/)
    .filter((w) => w.length > 1 && !STOP.has(w));
}

/** How many words of a person's profile appear in the text. */
function matchScore(person, text) {
  const haystack = new Set(words(text));
  const profile = words([person.specialization, ...(person.skills || [])].join(' '));
  let score = 0;
  for (const w of profile) if (haystack.has(w)) score += 1;
  return score;
}

function pickBest(candidates, text, load) {
  let best = null;
  for (const person of candidates) {
    const score = matchScore(person, text);
    const current = load.get(person.id) || 0;
    if (!best || score > best.score || (score === best.score && current < best.load)) {
      best = { person, score, load: current };
    }
  }
  return best ? best.person.id : null;
}

/**
 * @param {{projects: Array}} draft  AI output (mutated copy is returned)
 * @param {{ directory: Array<{id,name,role,specialization,skills}>, meetingDate: string,
 *           agentHours?: Map<string,number>, managerProjects?: Map<string,number> }} ctx
 * @returns {{ draft: {projects: Array}, filled: Array<{path: string, message: string}> }}
 */
function autofillDraft(draft, { directory, meetingDate, agentHours = new Map(), managerProjects = new Map() }) {
  const filled = [];
  const managers = directory.filter((u) => u.role === 'MANAGER').map((u) => ({ ...u, id: String(u.id) }));
  const agents = directory.filter((u) => u.role === 'AGENT').map((u) => ({ ...u, id: String(u.id) }));
  const managerIds = new Set(managers.map((u) => u.id));
  const agentIds = new Set(agents.map((u) => u.id));
  const agentLoad = new Map(agentHours);
  const managerLoad = new Map(managerProjects);
  const nameOf = (id) => directory.find((u) => String(u.id) === id)?.name || id;

  const projects = (Array.isArray(draft?.projects) ? draft.projects : []).filter((p) => p && typeof p === 'object');

  const out = projects.map((p, pi) => {
    const project = { ...p };
    const at = `projects[${pi}]`;
    project.name = String(project.name || '').trim() || `Project ${pi + 1}`;
    project.description = String(project.description || '').trim();
    project.tasks = (Array.isArray(project.tasks) ? project.tasks : []).filter((t) => t && typeof t === 'object');

    if (!String(project.clientName || '').trim()) {
      project.clientName = project.name;
      filled.push({ path: `${at}.clientName`, message: `Client set to "${project.name}" (not stated in the meeting)` });
    }

    if (!managerIds.has(project.managerId)) {
      const text = [project.name, project.clientName, project.description, ...project.tasks.map((t) => t.title)].join(' ');
      project.managerId = pickBest(managers, text, managerLoad);
      filled.push({ path: `${at}.managerId`, message: `Manager assigned: ${nameOf(project.managerId)}` });
    }
    managerLoad.set(project.managerId, (managerLoad.get(project.managerId) || 0) + 1);

    // Project deadline: stated, else latest task deadline, else a default window.
    if (!isRealDate(project.deadline)) {
      const taskDates = project.tasks.map((t) => t.deadline).filter(isRealDate).sort();
      project.deadline = taskDates.length ? taskDates[taskDates.length - 1] : addDays(meetingDate, DEFAULT_PROJECT_WEEKS * 7);
      filled.push({ path: `${at}.deadline`, message: `Project deadline set to ${project.deadline}` });
    }

    project.tasks = project.tasks.map((t, ti) => {
      const task = { ...t };
      const tat = `${at}.tasks[${ti}]`;
      task.title = String(task.title || '').trim() || `Task ${ti + 1}`;
      task.description = String(task.description || '').trim();

      let hours = typeof task.estimatedHours === 'string' ? parseFloat(task.estimatedHours) : task.estimatedHours;
      if (!Number.isFinite(hours) || hours <= 0) {
        hours = DEFAULT_HOURS;
        filled.push({ path: `${tat}.estimatedHours`, message: `Estimate set to ${DEFAULT_HOURS} h` });
      }
      task.estimatedHours = hours;

      if (!agentIds.has(task.assigneeId)) {
        task.assigneeId = pickBest(agents, `${task.title} ${task.description} ${project.description}`, agentLoad);
        filled.push({ path: `${tat}.assigneeId`, message: `Assigned to ${nameOf(task.assigneeId)}` });
      }
      agentLoad.set(task.assigneeId, (agentLoad.get(task.assigneeId) || 0) + hours);

      if (!isRealDate(task.deadline) || task.deadline > project.deadline) {
        task.deadline = project.deadline;
        filled.push({ path: `${tat}.deadline`, message: `Task deadline set to ${project.deadline}` });
      }
      return task;
    });

    return project;
  });

  return { draft: { projects: out }, filled };
}

module.exports = { autofillDraft };
