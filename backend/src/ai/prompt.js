'use strict';

/**
 * prompt.js - builds the system + user messages for the AI extraction call.
 *
 * The system prompt MUST NOT contain the real transcript or hardcoded answer key.
 * It includes:
 *   - Strict output schema rules
 *   - A tiny invented few-shot example (bakery domain) to demonstrate
 *     correction handling (late revision wins, name-not-in-directory = skip)
 *   - All disambiguation rules numbered for easy reference
 */

/**
 * Build the messages array for a chat completions call.
 *
 * @param {{ transcript: string, directory: Array<{id,name,role,specialization,skills}>, meetingDate: string }} opts
 * @returns {Array<{role:'system'|'user', content:string}>}
 */
function buildMessages({ transcript, directory, meetingDate }) {
  const systemPrompt = `You are a project-management assistant. Your job is to read a meeting transcript and extract a structured list of projects and tasks.

OUTPUT RULES (read carefully — every rule is mandatory):

1. Return ONLY a JSON object that exactly matches this schema — no prose, no markdown, no code fences:
   {"projects":[{"name":"...","clientName":"...","description":"...","managerId":"...","deadline":"YYYY-MM-DD","tasks":[{"title":"...","description":"...","assigneeId":"...","deadline":"YYYY-MM-DD","estimatedHours":<number>}]}]}

2. IDs ONLY from the directory. Match spoken first names to the id column in the directory table. If a person's name does not appear in the directory (clients, outside contacts, end-users) do NOT assign them — set the relevant field to null. Never invent an id.

3. FINAL DECISIONS WIN. If a deadline, estimate, or owner is revised during the meeting, use the LATEST agreed value. If a final recap is present, it is authoritative and overrides everything said earlier.

4. IGNORE rejected / out-of-scope / "future work" features — they must NOT become tasks. You may mention rejected scope in the project description field.

5. ONE TASK PER DISTINCT PIECE OF WORK as named in the meeting. Do NOT split a single task into subtasks. Do NOT merge two separately-named tasks even if the same person owns both, or that person owns tasks across two different projects. Separate clients = separate projects, always.

6. estimatedHours is developer effort expressed as a plain number (hours, not calendar days). Never create management-overhead tasks.

7. DATES: the meeting date is provided. Convert spoken phrases ("20 October", "Oct 20") to YYYY-MM-DD using the year of the meeting. If a year is not stated, use the meeting year.

8. Project fields: name and clientName exactly as stated; managerId is the person who explicitly says they manage / will manage the project; deadline is the FINAL project deadline; description is a concise scope summary including explicit exclusions.
   Task fields: title exactly as named in the meeting; description is 1-2 sentences summarising the agreed work; assigneeId is the person who owns the task; deadline and estimatedHours as finally agreed.

9. Never invent projects, tasks, people, hours, or dates. If a required field cannot be determined from the transcript, output null for that field.

---
FEW-SHOT EXAMPLE (bakery domain — not related to real transcript):

Directory:
id    | name      | role    | specialization | skills
MGR01 | Fatima    | MANAGER | Bakery PM      | planning, client liaison
DEV01 | Kamil     | AGENT   | Baker          | cakes, pastries
DEV02 | Layla     | AGENT   | Baker          | breads, pastries

Transcript excerpt (bakery meeting, date 2026-03-01):
  Fatima: We have two client orders. First, Sweet Treats Cafe wants 200 cupcakes by March 10. Initially I said March 8 but the client just confirmed March 10 is fine.
  Kamil: I can bake the cupcakes. Estimate 6 hours.
  Fatima: Second, Garden Hotel wants an assorted bread selection for their event. Khalid from the hotel will supply a list — but Khalid is not our staff, do not assign him.
  Layla: I'll handle the bread baking. About 8 hours, due March 9. We are not making custom cakes for Garden Hotel — only bread.
  Fatima: Correct. No custom cake task for Garden Hotel.
  [RECAP] Fatima: Final: Sweet Treats Cafe — Kamil, cupcakes, 6 hours, March 10. Garden Hotel — Layla, bread selection, 8 hours, March 9. No cake task.

Correct output (use the RECAP values; March 8 is overridden by March 10; Khalid is not in the directory so no assignee there):
{"projects":[{"name":"Sweet Treats Cafe Order","clientName":"Sweet Treats Cafe","description":"Bake 200 cupcakes for client review. Custom decorations excluded from this phase.","managerId":"MGR01","deadline":"2026-03-10","tasks":[{"title":"Cupcake baking","description":"Bake and prepare 200 cupcakes for delivery by the deadline.","assigneeId":"DEV01","deadline":"2026-03-10","estimatedHours":6}]},{"name":"Garden Hotel Bread Order","clientName":"Garden Hotel","description":"Assorted bread selection for hotel event. Custom cakes excluded.","managerId":"MGR01","deadline":"2026-03-09","tasks":[{"title":"Bread selection baking","description":"Bake the assorted bread selection as specified by the client list.","assigneeId":"DEV02","deadline":"2026-03-09","estimatedHours":8}]}]}

---
Now apply these exact rules to the real meeting transcript provided in the user message. Return only the JSON object.`;

  // Build compact directory table for the user message
  const header = 'id | name | role | specialization | skills';
  const separator = '---|---|---|---|---';
  const rows = directory
    .map(
      (u) =>
        `${u.id} | ${u.name} | ${u.role} | ${u.specialization} | ${
          Array.isArray(u.skills) ? u.skills.join(', ') : u.skills
        }`
    )
    .join('\n');

  const userMessage =
    `Meeting date: ${meetingDate}\n\n` +
    `Team directory:\n${header}\n${separator}\n${rows}\n\n` +
    `Full transcript:\n${transcript}`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ];
}

/**
 * Build a minimal "repair" message pair to fix invalid JSON.
 * Appends a correction request to the conversation.
 *
 * @param {Array} originalMessages
 * @param {string} badText  The bad response the model gave
 * @param {string} parseError  The JSON.parse error message
 * @returns {Array<{role,content}>}
 */
function buildRepairMessages(originalMessages, badText, parseError) {
  return [
    ...originalMessages,
    { role: 'assistant', content: badText },
    {
      role: 'user',
      content: `Your previous response was not valid JSON. Error: ${parseError}\nReturn only the JSON object — no prose, no markdown, no code fences.`,
    },
  ];
}

module.exports = { buildMessages, buildRepairMessages };
