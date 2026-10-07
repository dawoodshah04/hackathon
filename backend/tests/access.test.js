'use strict';

/**
 * backend/tests/access.test.js
 * Plain Node 22 fetch — run against a live server.
 * Usage: BASE_URL=http://localhost:5000 node tests/access.test.js
 *
 * Steps:
 *  1. seed (assumes npm run seed already run)
 *  2. reset:work (clear projects/tasks)
 *  3. admin login + commit answer-key draft
 *  4. assert access rules for every role
 *  5. assert validation rules (bad drafts should not commit)
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const PASS = '✅ PASS';
const FAIL = '❌ FAIL';

const results = [];

function assert(name, condition, detail = '') {
  const status = condition ? PASS : FAIL;
  results.push({ name, status, detail });
  console.log(`${status}  ${name}${detail ? ' — ' + detail : ''}`);
}

async function api(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

async function login(email, password = 'Demo123!') {
  const r = await api('POST', '/auth/login', { email, password });
  if (r.status !== 200) throw new Error(`Login failed for ${email}: ${JSON.stringify(r.json)}`);
  return r.json.token;
}

// ─── reset work before test ───────────────────────────────────────────────────
async function resetWork() {
  // We call the server health first to warm up
  const h = await api('GET', '/health');
  if (h.status !== 200) throw new Error('Server not responding at ' + BASE_URL);
  console.log(`\n[test] Connected to ${BASE_URL} (aiMode=${h.json.aiMode})\n`);

  // We do NOT call npm run reset:work from here; instead we use the admin
  // commit approach — caller is expected to ensure a clean state or we just
  // add on top. The test assertions use exact counts so run reset:work first.
  console.log('[test] NOTE: run "npm run reset:work" before this test for clean state.\n');
}

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  NovaWorks Access Control Test Suite');
  console.log('═══════════════════════════════════════════════\n');

  await resetWork();

  // ── 1. Admin login ─────────────────────────────────────────────────────────
  const adminToken = await login('admin@novaworks.example');
  assert('Admin login returns token', typeof adminToken === 'string' && adminToken.length > 10);

  // ── 2. Commit answer-key draft ─────────────────────────────────────────────
  const draft = require('./fixtures/answerKeyDraft.json');
  const commitRes = await api('POST', '/transcripts/commit', { draft }, adminToken);
  assert(
    'Admin can commit answer-key draft (201)',
    commitRes.status === 201,
    `status=${commitRes.status}`
  );

  if (commitRes.status !== 201) {
    console.error('Commit failed:', JSON.stringify(commitRes.json, null, 2));
    console.error('\n[test] Cannot proceed without committed data. Aborting.\n');
    process.exit(1);
  }

  const { totals } = commitRes.json;
  assert('Commit returns 3 projects', totals.projects === 3, `got ${totals.projects}`);
  assert('Commit returns 12 tasks', totals.tasks === 12, `got ${totals.tasks}`);

  // ── 3. Admin sees all projects ─────────────────────────────────────────────
  const adminProjectsRes = await api('GET', '/projects', null, adminToken);
  assert(
    'Admin sees 3 projects',
    adminProjectsRes.json.projects.length === 3,
    `got ${adminProjectsRes.json.projects.length}`
  );

  // ── 4. Ayesha (PM01) sees only UrbanCart ──────────────────────────────────
  const ayeshaToken = await login('ayesha@novaworks.example');
  const ayeshaProjects = await api('GET', '/projects', null, ayeshaToken);
  assert(
    'Ayesha sees only 1 project',
    ayeshaProjects.json.projects.length === 1,
    `got ${ayeshaProjects.json.projects.length}`
  );
  assert(
    'Ayesha sees UrbanCart',
    ayeshaProjects.json.projects[0]?.name === 'UrbanCart Website',
    ayeshaProjects.json.projects[0]?.name
  );

  // ── 5. Bilal (PM02) sees only QuickServe ──────────────────────────────────
  const bilalToken = await login('bilal@novaworks.example');
  const bilalProjects = await api('GET', '/projects', null, bilalToken);
  assert(
    'Bilal sees only 1 project',
    bilalProjects.json.projects.length === 1,
    `got ${bilalProjects.json.projects.length}`
  );
  assert(
    'Bilal sees QuickServe',
    bilalProjects.json.projects[0]?.name === 'QuickServe Mobile App',
    bilalProjects.json.projects[0]?.name
  );

  // ── 6. Hina (PM03) sees only HelpDeskPro ──────────────────────────────────
  const hinaToken = await login('hina@novaworks.example');
  const hinaProjects = await api('GET', '/projects', null, hinaToken);
  assert(
    'Hina sees only 1 project',
    hinaProjects.json.projects.length === 1,
    `got ${hinaProjects.json.projects.length}`
  );
  assert(
    'Hina sees HelpDeskPro',
    hinaProjects.json.projects[0]?.name === 'HelpDeskPro AI Assistant',
    hinaProjects.json.projects[0]?.name
  );

  // ── 7. Ali (DEV01) — 3 tasks, 1 project (UrbanCart) ──────────────────────
  const aliToken = await login('ali@novaworks.example');
  const aliMine = await api('GET', '/tasks/mine', null, aliToken);
  assert(
    'Ali /tasks/mine returns 3 tasks',
    aliMine.json.tasks.length === 3,
    `got ${aliMine.json.tasks.length}`
  );

  const aliProjects = await api('GET', '/projects', null, aliToken);
  assert(
    'Ali sees only 1 project',
    aliProjects.json.projects.length === 1,
    `got ${aliProjects.json.projects.length}`
  );

  // ── 8. Ali requesting QuickServe gets 403 ─────────────────────────────────
  // Find QuickServe project id from admin's list
  const quickserveProject = adminProjectsRes.json.projects.find(
    (p) => p.name === 'QuickServe Mobile App'
  );
  assert('QuickServe project exists in admin list', !!quickserveProject);

  if (quickserveProject) {
    const aliQuickServe = await api('GET', `/projects/${quickserveProject.id}`, null, aliToken);
    assert(
      'Ali gets 403 requesting QuickServe directly',
      aliQuickServe.status === 403,
      `got ${aliQuickServe.status}`
    );
  }

  // ── 9. Hamza (DEV02) sees 2 tasks across 2 projects ───────────────────────
  const hamzaToken = await login('hamza@novaworks.example');
  const hamzaMine = await api('GET', '/tasks/mine', null, hamzaToken);
  assert(
    'Hamza /tasks/mine returns 2 tasks',
    hamzaMine.json.tasks.length === 2,
    `got ${hamzaMine.json.tasks.length}`
  );

  if (hamzaMine.json.tasks.length === 2) {
    const projectNames = new Set(hamzaMine.json.tasks.map((t) => t.project?.name));
    assert(
      'Hamza tasks span 2 different projects',
      projectNames.size === 2,
      `projects: ${[...projectNames].join(', ')}`
    );
  }

  // ── 10. Ali /tasks/mine sees no other agent's tasks ───────────────────────
  if (aliMine.json.tasks) {
    const nonAliTask = aliMine.json.tasks.find((t) => t.assignee?.id !== 'DEV01');
    assert(
      "Ali's /tasks/mine contains no other agent's tasks",
      !nonAliTask,
      nonAliTask ? `found task by ${nonAliTask.assignee?.id}` : 'all tasks are Ali\'s'
    );
  }

  // ── 11. No token = 401 ────────────────────────────────────────────────────
  const noToken = await api('GET', '/projects');
  assert('No token returns 401', noToken.status === 401, `got ${noToken.status}`);

  // ── 12. Manager calling /transcripts/draft = 403 ─────────────────────────
  const ayeshaDraft = await api(
    'POST',
    '/transcripts/draft',
    { transcript: 'test' },
    ayeshaToken
  );
  assert(
    'Manager calling /transcripts/draft gets 403',
    ayeshaDraft.status === 403,
    `got ${ayeshaDraft.status}`
  );

  // ── 13. Agent calling /transcripts/draft = 403 ────────────────────────────
  const aliDraft = await api('POST', '/transcripts/draft', { transcript: 'test' }, aliToken);
  assert(
    'Agent calling /transcripts/draft gets 403',
    aliDraft.status === 403,
    `got ${aliDraft.status}`
  );

  // ── 14. Validation — unknown assignee ─────────────────────────────────────
  const badAssigneeDraft = {
    projects: [
      {
        name: 'Test',
        clientName: 'Test',
        managerId: 'PM01',
        deadline: '2026-11-01',
        tasks: [
          { title: 'Task 1', assigneeId: 'NOTAUSER', deadline: '2026-10-20', estimatedHours: 5 },
        ],
      },
    ],
  };
  const badAssigneeCommit = await api(
    'POST',
    '/transcripts/commit',
    { draft: badAssigneeDraft },
    adminToken
  );
  assert(
    'Unknown assignee returns 422',
    badAssigneeCommit.status === 422,
    `got ${badAssigneeCommit.status}`
  );
  assert(
    'Unknown assignee has issues',
    Array.isArray(badAssigneeCommit.json?.error?.issues) &&
      badAssigneeCommit.json.error.issues.length > 0,
    JSON.stringify(badAssigneeCommit.json?.error?.issues)
  );

  // ── 15. Validation — Kamran-like id (not an employee) ─────────────────────
  const kamranDraft = {
    projects: [
      {
        name: 'Test',
        clientName: 'Test',
        managerId: 'PM01',
        deadline: '2026-11-01',
        tasks: [
          { title: 'Task', assigneeId: 'KAMRAN', deadline: '2026-10-20', estimatedHours: 5 },
        ],
      },
    ],
  };
  const kamranCommit = await api(
    'POST',
    '/transcripts/commit',
    { draft: kamranDraft },
    adminToken
  );
  assert(
    '"Kamran" id returns 422 (not an employee)',
    kamranCommit.status === 422,
    `got ${kamranCommit.status}`
  );

  // ── 16. Validation — negative hours ───────────────────────────────────────
  const negHoursDraft = {
    projects: [
      {
        name: 'Test',
        clientName: 'Test',
        managerId: 'PM01',
        deadline: '2026-11-01',
        tasks: [{ title: 'Task', assigneeId: 'DEV01', deadline: '2026-10-20', estimatedHours: -5 }],
      },
    ],
  };
  const negCommit = await api('POST', '/transcripts/commit', { draft: negHoursDraft }, adminToken);
  assert('Negative hours returns 422', negCommit.status === 422, `got ${negCommit.status}`);

  // ── 17. Validation — task deadline after project deadline ─────────────────
  const lateTaskDraft = {
    projects: [
      {
        name: 'Test',
        clientName: 'Test',
        managerId: 'PM01',
        deadline: '2026-10-15',
        tasks: [{ title: 'Task', assigneeId: 'DEV01', deadline: '2026-10-25', estimatedHours: 5 }],
      },
    ],
  };
  const lateCommit = await api(
    'POST',
    '/transcripts/commit',
    { draft: lateTaskDraft },
    adminToken
  );
  assert(
    'Task deadline after project deadline returns 422',
    lateCommit.status === 422,
    `got ${lateCommit.status}`
  );

  // ── 18. Counts unchanged after bad commits ────────────────────────────────
  const afterBadAdmin = await api('GET', '/projects', null, adminToken);
  assert(
    'Project count unchanged after bad commits (still 3)',
    afterBadAdmin.json.projects.length === 3,
    `got ${afterBadAdmin.json.projects.length}`
  );

  // ── 19. Invalid ObjectId returns 404 ──────────────────────────────────────
  const invalidId = await api('GET', '/projects/not-an-id', null, adminToken);
  assert('Invalid project id returns 404', invalidId.status === 404, `got ${invalidId.status}`);

  // ── 20. Managers and agents cannot call /tasks/mine (MANAGER = 403) ───────
  const ayeshaMine = await api('GET', '/tasks/mine', null, ayeshaToken);
  assert(
    'Manager calling /tasks/mine gets 403',
    ayeshaMine.status === 403,
    `got ${ayeshaMine.status}`
  );

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════');
  const passed = results.filter((r) => r.status === PASS).length;
  const failed = results.filter((r) => r.status === FAIL).length;
  console.log(`  Results: ${passed} passed, ${failed} failed out of ${results.length} tests`);
  console.log('═══════════════════════════════════════════════\n');

  if (failed > 0) {
    console.log('Failed tests:');
    results
      .filter((r) => r.status === FAIL)
      .forEach((r) => console.log(`  ${r.status}  ${r.name}  ${r.detail}`));
    process.exit(1);
  } else {
    console.log('All tests passed! 🎉');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('\n[test] Unexpected error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
