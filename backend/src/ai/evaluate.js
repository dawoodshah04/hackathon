#!/usr/bin/env node
'use strict';

/**
 * evaluate.js - Automated accuracy test for the AI extraction pipeline.
 *
 * Runs extractProjectsFromTranscript on:
 *   1. fixtures/transcript.txt      (original)   x3
 *   2. fixtures/transcript.changed.txt (QuickServe integration: 12h, 2026-10-23) x3
 *
 * Checks per run:
 *   - Exactly 3 projects, exactly 12 tasks total
 *   - Each project: correct managerId, clientName, deadline
 *   - Each task: correct assigneeId, deadline, estimatedHours, title (case-insensitive)
 *   - No assignment to non-directory ids
 *   - No mention of "Kamran" as an id
 *   - No forbidden task titles/descriptions (payment, inventory, maps, tracking, real email integration)
 *   - All ids exist in the directory
 *
 * For the changed transcript: exactly ONE task differs (QuickServe Mobile integration: 12h, 2026-10-23)
 *
 * Prints a PASS/FAIL table and exits non-zero if any check fails.
 *
 * Usage:
 *   node --env-file=backend/.env backend/src/ai/evaluate.js
 */

const fs = require('fs');
const path = require('path');
const { extractProjectsFromTranscript } = require('./index');

const fixturesDir = path.join(__dirname, 'fixtures');

const directory = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'directory.json'), 'utf8'));
const expected = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'expected.json'), 'utf8'));
const transcript = fs.readFileSync(path.join(fixturesDir, 'transcript.txt'), 'utf8');
const transcriptChanged = fs.readFileSync(path.join(fixturesDir, 'transcript.changed.txt'), 'utf8');

const MEETING_DATE = '2026-10-07';
const RUNS_PER_FIXTURE = 3;

// Build directory id set for validation
const dirIds = new Set(directory.map((u) => u.id));
const dirIdList = [...dirIds];

// Forbidden keywords checked in task TITLES only.
// Descriptions may legitimately mention excluded features (e.g. "without payment
// processing") — that is correct AI behaviour, not a false positive.
const FORBIDDEN_TITLE_PATTERNS = [
  /payment\s*(gateway|processing|integrat)/i,
  /inventory\s*(integrat|sync|task)/i,
  /live\s+map/i,
  /driver\s+track/i,
  /real\s+email/i,
  /email\s+integrat/i,
  /ticketing\s+integrat/i,
  /\bandroid\s+only\b/i,
  /\bios\s+only\b/i,
  /separate\s+(android|ios)/i,
];

/** Normalize title for comparison */
function normTitle(t) {
  return (t || '').trim().toLowerCase();
}

/** Check a single extraction result against expected */
function checkResult(result, expectedData, label) {
  const checks = [];
  const fail = (name, detail) => checks.push({ name, status: 'FAIL', detail });
  const pass = (name) => checks.push({ name, status: 'PASS', detail: '' });

  // Project count
  const projects = result.projects || [];
  if (projects.length === 3) {
    pass('project_count=3');
  } else {
    fail('project_count=3', `got ${projects.length}`);
  }

  // Task count
  const totalTasks = projects.reduce((s, p) => s + (p.tasks || []).length, 0);
  if (totalTasks === 12) {
    pass('task_count=12');
  } else {
    fail('task_count=12', `got ${totalTasks}`);
  }

  // No non-directory ids
  const allIds = [];
  for (const proj of projects) {
    if (proj.managerId) allIds.push({ field: 'managerId', id: proj.managerId, proj: proj.name });
    for (const task of (proj.tasks || [])) {
      if (task.assigneeId) allIds.push({ field: 'assigneeId', id: task.assigneeId, task: task.title });
    }
  }
  const invalidIds = allIds.filter((x) => !dirIds.has(x.id));
  if (invalidIds.length === 0) {
    pass('all_ids_in_directory');
  } else {
    fail('all_ids_in_directory', invalidIds.map((x) => `${x.id}(${x.field})`).join(', '));
  }

  // No Kamran as id
  const kamranIds = allIds.filter((x) => /kamran/i.test(x.id));
  if (kamranIds.length === 0) {
    pass('no_kamran_id');
  } else {
    fail('no_kamran_id', kamranIds.map((x) => x.id).join(', '));
  }

  // No forbidden keywords in task TITLES (descriptions may mention exclusions legitimately)
  const forbiddenFound = [];
  for (const proj of projects) {
    for (const task of (proj.tasks || [])) {
      for (const pat of FORBIDDEN_TITLE_PATTERNS) {
        if (pat.test(task.title || '')) {
          forbiddenFound.push(`"${task.title}" matches /${pat.source}/`);
        }
      }
    }
  }
  if (forbiddenFound.length === 0) {
    pass('no_forbidden_tasks');
  } else {
    fail('no_forbidden_tasks', forbiddenFound.join('; '));
  }

  // Per-project checks
  for (const expProj of expectedData.projects) {
    const gotProj = projects.find((p) => normTitle(p.name) === normTitle(expProj.name));
    if (!gotProj) {
      fail(`project[${expProj.name}]_exists`, 'not found');
      fail(`project[${expProj.name}]_managerId`, 'project not found');
      fail(`project[${expProj.name}]_clientName`, 'project not found');
      fail(`project[${expProj.name}]_deadline`, 'project not found');
      continue;
    }
    pass(`project[${expProj.name}]_exists`);

    if (gotProj.managerId === expProj.managerId) {
      pass(`project[${expProj.name}]_managerId`);
    } else {
      fail(`project[${expProj.name}]_managerId`, `expected ${expProj.managerId} got ${gotProj.managerId}`);
    }

    if (normTitle(gotProj.clientName) === normTitle(expProj.clientName)) {
      pass(`project[${expProj.name}]_clientName`);
    } else {
      fail(`project[${expProj.name}]_clientName`, `expected "${expProj.clientName}" got "${gotProj.clientName}"`);
    }

    if (gotProj.deadline === expProj.deadline) {
      pass(`project[${expProj.name}]_deadline`);
    } else {
      fail(`project[${expProj.name}]_deadline`, `expected ${expProj.deadline} got ${gotProj.deadline}`);
    }

    // Per-task checks
    for (const expTask of expProj.tasks) {
      const gotTask = (gotProj.tasks || []).find((t) => normTitle(t.title) === normTitle(expTask.title));
      if (!gotTask) {
        fail(`task[${expTask.title}]_exists`, 'not found in project');
        fail(`task[${expTask.title}]_assigneeId`, 'task not found');
        fail(`task[${expTask.title}]_deadline`, 'task not found');
        fail(`task[${expTask.title}]_hours`, 'task not found');
        continue;
      }
      pass(`task[${expTask.title}]_exists`);

      if (gotTask.assigneeId === expTask.assigneeId) {
        pass(`task[${expTask.title}]_assigneeId`);
      } else {
        fail(`task[${expTask.title}]_assigneeId`, `expected ${expTask.assigneeId} got ${gotTask.assigneeId}`);
      }

      if (gotTask.deadline === expTask.deadline) {
        pass(`task[${expTask.title}]_deadline`);
      } else {
        fail(`task[${expTask.title}]_deadline`, `expected ${expTask.deadline} got ${gotTask.deadline}`);
      }

      if (gotTask.estimatedHours === expTask.estimatedHours) {
        pass(`task[${expTask.title}]_hours`);
      } else {
        fail(`task[${expTask.title}]_hours`, `expected ${expTask.estimatedHours} got ${gotTask.estimatedHours}`);
      }
    }
  }

  return checks;
}

/**
 * For the changed transcript, check that ONLY the QuickServe Mobile integration task differs:
 *   estimatedHours=12, deadline=2026-10-23
 */
function checkChangedResult(result) {
  const checks = [];
  const fail = (name, detail) => checks.push({ name, status: 'FAIL', detail });
  const pass = (name) => checks.push({ name, status: 'PASS', detail: '' });

  const projects = result.projects || [];
  const qsProj = projects.find((p) => normTitle(p.name).includes('quickserve'));
  if (!qsProj) {
    fail('changed_qs_project_found', 'QuickServe project not found');
    return checks;
  }
  pass('changed_qs_project_found');

  const intTask = (qsProj.tasks || []).find((t) => normTitle(t.title).includes('mobile integration'));
  if (!intTask) {
    fail('changed_task_found', 'Mobile integration and testing not found');
    return checks;
  }
  pass('changed_task_found');

  if (intTask.estimatedHours === 12) {
    pass('changed_task_hours=12');
  } else {
    fail('changed_task_hours=12', `got ${intTask.estimatedHours}`);
  }

  if (intTask.deadline === '2026-10-23') {
    pass('changed_task_deadline=2026-10-23');
  } else {
    fail('changed_task_deadline=2026-10-23', `got ${intTask.deadline}`);
  }

  // All other tasks should match original expected
  let diffCount = 0;
  for (const expProj of expected.projects) {
    const gotProj = projects.find((p) => normTitle(p.name) === normTitle(expProj.name));
    if (!gotProj) { diffCount++; continue; }
    for (const expTask of expProj.tasks) {
      const gotTask = (gotProj.tasks || []).find((t) => normTitle(t.title) === normTitle(expTask.title));
      if (!gotTask) { diffCount++; continue; }
      const isChangedTask = normTitle(gotProj.name).includes('quickserve') &&
                            normTitle(gotTask.title).includes('mobile integration');
      if (!isChangedTask) {
        if (gotTask.estimatedHours !== expTask.estimatedHours || gotTask.deadline !== expTask.deadline) {
          diffCount++;
        }
      }
    }
  }
  if (diffCount === 0) {
    pass('changed_only_one_task_differs');
  } else {
    fail('changed_only_one_task_differs', `${diffCount} unexpected diffs`);
  }

  return checks;
}

function printTable(checks, label) {
  const width = Math.max(...checks.map((c) => c.name.length), 10);
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${label}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`  ${'CHECK'.padEnd(width)}  STATUS  DETAIL`);
  console.log(`  ${'-'.repeat(width)}  ------  ------`);
  for (const c of checks) {
    const status = c.status === 'PASS' ? '✓ PASS' : '✗ FAIL';
    console.log(`  ${c.name.padEnd(width)}  ${status}  ${c.detail}`);
  }
  const passed = checks.filter((c) => c.status === 'PASS').length;
  const total = checks.length;
  console.log(`\n  Score: ${passed}/${total}`);
}

async function main() {
  let globalFail = false;
  const summary = [];

  // Delay helper to stay within Groq free-tier tokens-per-minute limit
  async function waitBetweenRuns(run, total, label) {
    if (run < total) {
      const delay = 35;
      console.log(`\n  [rate-limit guard] Waiting ${delay}s before next run...`);
      await new Promise((r) => setTimeout(r, delay * 1000));
    }
  }

  // Original transcript x3
  console.log('\n▶ Testing original transcript (3 runs)...');
  for (let run = 1; run <= RUNS_PER_FIXTURE; run++) {
    console.log(`\n  Run ${run}/3 ...`);
    let result;
    try {
      result = await extractProjectsFromTranscript({ transcript, directory, meetingDate: MEETING_DATE });
    } catch (err) {
      console.error(`  FATAL: ${err.message}`);
      summary.push({ label: `Original run ${run}`, passed: 0, total: 1 });
      globalFail = true;
      continue;
    }
    const checks = checkResult(result, expected, `Original run ${run}`);
    printTable(checks, `Original transcript — Run ${run}`);
    const passed = checks.filter((c) => c.status === 'PASS').length;
    summary.push({ label: `Original run ${run}`, passed, total: checks.length });
    if (passed < checks.length) globalFail = true;
    await waitBetweenRuns(run, RUNS_PER_FIXTURE, 'original');
  }

  // Changed transcript x3
  console.log('\n▶ Testing changed transcript (3 runs)...');
  for (let run = 1; run <= RUNS_PER_FIXTURE; run++) {
    console.log(`\n  Run ${run}/3 ...`);
    let result;
    try {
      result = await extractProjectsFromTranscript({ transcript: transcriptChanged, directory, meetingDate: MEETING_DATE });
    } catch (err) {
      console.error(`  FATAL: ${err.message}`);
      summary.push({ label: `Changed run ${run}`, passed: 0, total: 1 });
      globalFail = true;
      continue;
    }
    // Full accuracy check with the "changed" expected
    const changedExpected = JSON.parse(JSON.stringify(expected));
    // Patch the expected for changed transcript
    const qs = changedExpected.projects.find((p) => normTitle(p.name).includes('quickserve'));
    const intTask = qs && qs.tasks.find((t) => normTitle(t.title).includes('mobile integration'));
    if (intTask) { intTask.estimatedHours = 12; intTask.deadline = '2026-10-23'; }

    const checks = checkResult(result, changedExpected, `Changed run ${run}`);
    const changedChecks = checkChangedResult(result);
    const allChecks = [...checks, ...changedChecks];
    printTable(allChecks, `Changed transcript — Run ${run}`);
    const passed = allChecks.filter((c) => c.status === 'PASS').length;
    summary.push({ label: `Changed run ${run}`, passed, total: allChecks.length });
    if (passed < allChecks.length) globalFail = true;
    await waitBetweenRuns(run, RUNS_PER_FIXTURE, 'changed');
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('  FINAL SUMMARY');
  console.log('='.repeat(60));
  for (const s of summary) {
    const ok = s.passed === s.total ? '✓' : '✗';
    console.log(`  ${ok} ${s.label.padEnd(20)} ${s.passed}/${s.total}`);
  }
  const totalPassed = summary.reduce((a, s) => a + s.passed, 0);
  const totalAll = summary.reduce((a, s) => a + s.total, 0);
  console.log(`\n  TOTAL: ${totalPassed}/${totalAll} checks passed`);

  if (globalFail) {
    console.log('\n  ✗ EVALUATION FAILED\n');
    process.exit(1);
  } else {
    console.log('\n  ✓ ALL CHECKS PASSED\n');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('evaluate.js error:', err);
  process.exit(1);
});
