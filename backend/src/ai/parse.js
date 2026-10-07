'use strict';

/**
 * parse.js - extract and normalise the JSON draft from raw model output.
 *
 * Steps:
 *  1. Strip markdown code fences (```json ... ```)
 *  2. Find the first balanced { ... } block
 *  3. JSON.parse
 *  4. Normalise fields without changing meaning:
 *     - trim strings
 *     - estimatedHours: "12 hours" -> 12, "12" -> 12
 *     - dates: "2026-10-2" -> "2026-10-02"
 *     - ids: uppercase + trim; if a full name was returned, map to directory id
 *     - drop exact-duplicate tasks within a project (same title, case-insensitive)
 *  5. Ensure shape { projects: [...] } always present
 *
 * Semantic errors (wrong id, null fields) are left for the backend validator.
 */

/**
 * Extract the first balanced {...} block from a string.
 * @param {string} text
 * @returns {string|null}
 */
function extractBraces(text) {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

/**
 * Normalise a date string to YYYY-MM-DD.
 * Handles "2026-10-2" -> "2026-10-02"
 * @param {string|null} val
 * @returns {string|null}
 */
function normaliseDate(val) {
  if (!val || typeof val !== 'string') return val ?? null;
  const t = val.trim();
  // Already YYYY-MM-DD with zero-padding?
  const m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    const [, y, mo, d] = m;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return t; // leave as-is; the backend validator will reject bad formats
}

/**
 * Normalise estimatedHours: string "12" or "12 hours" -> number 12.
 * @param {*} val
 * @returns {number|null}
 */
function normaliseHours(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return isFinite(val) ? val : null;
  if (typeof val === 'string') {
    const n = parseFloat(val.replace(/[^0-9.]/g, ''));
    return isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Build a name->id map from the directory for name-to-id recovery.
 * Maps first name (lower) and full name (lower) to id.
 * @param {Array<{id,name}>} directory
 * @returns {Map<string,string>}
 */
function buildNameMap(directory) {
  const map = new Map();
  for (const u of directory) {
    if (!u || !u.id || !u.name) continue;
    const full = u.name.trim().toLowerCase();
    const first = full.split(/\s+/)[0];
    // Only map if unambiguous (no two people share a first name)
    if (!map.has(first)) {
      map.set(first, u.id);
    } else {
      map.set(first, null); // ambiguous — don't guess
    }
    map.set(full, u.id);
  }
  return map;
}

/**
 * Normalise an id field: uppercase, trim.
 * If it looks like a name (contains a space or is not all-caps), try to map it.
 * @param {*} val
 * @param {Map<string,string>} nameMap
 * @returns {string|null}
 */
function normaliseId(val, nameMap) {
  if (val === null || val === undefined) return null;
  if (typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (!trimmed) return null;

  // If it looks like a directory id (e.g. PM01, DEV02) return uppercased
  if (/^[A-Z]+\d+$/i.test(trimmed) && !trimmed.includes(' ')) {
    return trimmed.toUpperCase();
  }

  // Otherwise try to map it as a name
  const lower = trimmed.toLowerCase();
  if (nameMap.has(lower)) return nameMap.get(lower) ?? null;

  // Last resort: if it's all uppercase already, return as-is (might be a valid id)
  if (trimmed === trimmed.toUpperCase()) return trimmed;

  return null; // can't resolve — backend will flag it
}

/**
 * Parse and normalise raw model output into the draft shape.
 *
 * @param {string} rawText  Raw assistant output
 * @param {Array<{id,name}>} directory  Used for name->id recovery
 * @returns {{ projects: Array }}
 * @throws {Error} if JSON cannot be extracted
 */
function parseAndNormalise(rawText, directory = []) {
  // 1. Strip code fences
  let text = rawText.trim();
  text = text.replace(/^```[\w]*\n?/m, '').replace(/```\s*$/m, '').trim();

  // 2. Find first balanced { }
  const jsonStr = extractBraces(text);
  if (!jsonStr) {
    throw new Error('No JSON object found in model output');
  }

  // 3. Parse
  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (err) {
    throw new Error(`JSON.parse failed: ${err.message}`);
  }

  // 4. Normalise
  const nameMap = buildNameMap(directory);

  const projects = Array.isArray(parsed.projects) ? parsed.projects : [];

  const normalisedProjects = projects.map((proj) => {
    if (!proj || typeof proj !== 'object') return null;

    const tasks = Array.isArray(proj.tasks) ? proj.tasks : [];

    // Deduplicate tasks by title (case-insensitive)
    const seenTitles = new Set();
    const dedupedTasks = [];
    for (const task of tasks) {
      if (!task || typeof task !== 'object') continue;
      const titleKey = (task.title || '').trim().toLowerCase();
      if (titleKey && seenTitles.has(titleKey)) continue;
      seenTitles.add(titleKey);

      dedupedTasks.push({
        title: typeof task.title === 'string' ? task.title.trim() : (task.title ?? null),
        description: typeof task.description === 'string' ? task.description.trim() : (task.description ?? null),
        assigneeId: normaliseId(task.assigneeId, nameMap),
        deadline: normaliseDate(task.deadline),
        estimatedHours: normaliseHours(task.estimatedHours),
      });
    }

    return {
      name: typeof proj.name === 'string' ? proj.name.trim() : (proj.name ?? null),
      clientName: typeof proj.clientName === 'string' ? proj.clientName.trim() : (proj.clientName ?? null),
      description: typeof proj.description === 'string' ? proj.description.trim() : (proj.description ?? null),
      managerId: normaliseId(proj.managerId, nameMap),
      deadline: normaliseDate(proj.deadline),
      tasks: dedupedTasks,
    };
  }).filter(Boolean);

  return { projects: normalisedProjects };
}

module.exports = { parseAndNormalise };
