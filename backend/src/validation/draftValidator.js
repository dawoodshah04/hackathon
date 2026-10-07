'use strict';

const { z } = require('zod');

/**
 * Validates a YYYY-MM-DD date string for real calendar existence.
 * Returns false for dates like 2026-02-31.
 */
function isRealDate(str) {
  if (typeof str !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const d = new Date(str + 'T00:00:00.000Z');
  return !isNaN(d.getTime()) && d.toISOString().startsWith(str);
}

// Zod shape for the draft (permissive: null allowed for ids/dates so we can report meaningful issues)
const taskShape = z.object({
  title: z.string().min(1, 'Task title is required'),
  description: z.string().optional().default(''),
  assigneeId: z.union([z.string(), z.null()]).nullable(),
  deadline: z.union([z.string(), z.null()]).nullable(),
  estimatedHours: z.union([z.number(), z.string(), z.null()]).nullable(),
});

const projectShape = z.object({
  name: z.string().min(1, 'Project name is required'),
  clientName: z.string().min(1, 'Client name is required'),
  description: z.string().optional().default(''),
  managerId: z.union([z.string(), z.null()]).nullable(),
  deadline: z.union([z.string(), z.null()]).nullable(),
  tasks: z.array(taskShape).optional().default([]),
});

const draftShape = z.object({
  projects: z.array(projectShape).min(1, 'Draft must contain at least one project'),
});

/**
 * Validates a draft object against all rules from SHARED CONTEXT section 9.
 *
 * @param {object} draft  - The raw draft from AI or client body
 * @param {Array}  users  - All users from DB (used to check managerId/assigneeId roles)
 * @returns {{ valid: boolean, issues: Array<{path: string, message: string}> }}
 *
 * Never throws. Returns issues array (empty if valid).
 */
function validateDraft(draft, users) {
  const issues = [];

  // Shape parse
  const parsed = draftShape.safeParse(draft);
  if (!parsed.success) {
    for (const e of parsed.error.errors) {
      issues.push({ path: e.path.join('.') || 'draft', message: e.message });
    }
    // If shape is fundamentally broken, return early
    if (!parsed.data) return { valid: false, issues };
  }

  const data = parsed.data || {};
  const projects = data.projects || [];

  // Build user lookup maps
  const managerMap = {};
  const agentMap = {};
  for (const u of users) {
    const id = u._id || u.id;
    if (u.role === 'MANAGER') managerMap[id] = u;
    if (u.role === 'AGENT') agentMap[id] = u;
  }

  for (let pi = 0; pi < projects.length; pi++) {
    const p = projects[pi];
    const pPrefix = `projects[${pi}]`;

    // managerId
    if (!p.managerId) {
      issues.push({ path: `${pPrefix}.managerId`, message: 'Manager ID is required' });
    } else if (!managerMap[p.managerId]) {
      issues.push({
        path: `${pPrefix}.managerId`,
        message: `"${p.managerId}" is not a valid MANAGER id`,
      });
    }

    // project deadline
    if (!p.deadline) {
      issues.push({ path: `${pPrefix}.deadline`, message: 'Project deadline is required' });
    } else if (!isRealDate(p.deadline)) {
      issues.push({
        path: `${pPrefix}.deadline`,
        message: `"${p.deadline}" is not a valid calendar date`,
      });
    }

    const tasks = p.tasks || [];
    for (let ti = 0; ti < tasks.length; ti++) {
      const t = tasks[ti];
      const tPrefix = `${pPrefix}.tasks[${ti}]`;

      // title
      if (!t.title || t.title.trim() === '') {
        issues.push({ path: `${tPrefix}.title`, message: 'Task title is required' });
      }

      // assigneeId
      if (!t.assigneeId) {
        issues.push({ path: `${tPrefix}.assigneeId`, message: 'Assignee ID is required' });
      } else if (!agentMap[t.assigneeId]) {
        issues.push({
          path: `${tPrefix}.assigneeId`,
          message: `"${t.assigneeId}" is not a valid AGENT id`,
        });
      }

      // estimatedHours: coerce strings to number
      let hours = t.estimatedHours;
      if (typeof hours === 'string') hours = parseFloat(hours);
      if (hours === null || hours === undefined || !isFinite(hours) || hours <= 0) {
        issues.push({
          path: `${tPrefix}.estimatedHours`,
          message: 'estimatedHours must be a finite number greater than 0',
        });
      }

      // task deadline
      if (!t.deadline) {
        issues.push({ path: `${tPrefix}.deadline`, message: 'Task deadline is required' });
      } else if (!isRealDate(t.deadline)) {
        issues.push({
          path: `${tPrefix}.deadline`,
          message: `"${t.deadline}" is not a valid calendar date`,
        });
      } else if (p.deadline && isRealDate(p.deadline) && t.deadline > p.deadline) {
        // ISO string lexicographic comparison is valid for YYYY-MM-DD
        issues.push({
          path: `${tPrefix}.deadline`,
          message: `Task deadline (${t.deadline}) must not be after project deadline (${p.deadline})`,
        });
      }
    }
  }

  return { valid: issues.length === 0, issues };
}

module.exports = { validateDraft, isRealDate };
