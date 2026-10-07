'use strict';

const mongoose = require('mongoose');
const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const { extractDraft } = require('./aiAdapter');
const { validateDraft } = require('../validation/draftValidator');

// In-memory per-user commit lock to prevent concurrent double-commits
const commitLocks = new Set();

/**
 * Builds the employee directory for the AI: MANAGER and AGENT users only.
 * No emails, no password data, no ADMIN.
 */
async function buildDirectory() {
  const users = await User.find(
    { role: { $in: ['MANAGER', 'AGENT'] } },
    '_id name role specialization skills'
  ).lean();

  return users.map((u) => ({
    id: u._id,
    name: u.name,
    role: u.role,
    specialization: u.specialization,
    skills: u.skills,
  }));
}

/**
 * Fetches all users for validation (MANAGER and AGENT roles).
 */
async function getUsersForValidation() {
  return User.find({ role: { $in: ['MANAGER', 'AGENT'] } }, '_id role').lean();
}

/**
 * POST /api/transcripts/draft
 * Runs AI extraction + validation. Saves nothing.
 */
async function processDraft(transcript) {
  const directory = await buildDirectory();
  const draft = await extractDraft({ transcript, directory });

  const usersForValidation = await getUsersForValidation();
  const { issues } = validateDraft(draft, usersForValidation);

  return { draft, issues };
}

/**
 * POST /api/transcripts/commit
 * Re-validates, then saves all projects + tasks atomically.
 * Returns 409 if a commit for this user is already in progress.
 */
async function commitDraft(draft, userId) {
  // Concurrent commit lock
  if (commitLocks.has(userId)) {
    const err = new Error('A commit is already in progress for this user');
    err.statusCode = 409;
    err.code = 'BUSY';
    throw err;
  }

  commitLocks.add(userId);
  try {
    return await _doCommit(draft);
  } finally {
    commitLocks.delete(userId);
  }
}

async function _doCommit(draft) {
  const usersForValidation = await getUsersForValidation();
  const { valid, issues } = validateDraft(draft, usersForValidation);

  if (!valid) {
    const err = new Error('Draft validation failed');
    err.statusCode = 422;
    err.code = 'VALIDATION_FAILED';
    err.issues = issues;
    throw err;
  }

  // Try atomic transaction first (Atlas supports it)
  try {
    return await _commitWithTransaction(draft);
  } catch (txErr) {
    // If transactions aren't available (standalone mongod), fall back to sequential inserts
    if (
      txErr.codeName === 'CommandNotSupported' ||
      txErr.message.includes('Transaction numbers are only allowed') ||
      txErr.message.includes('replica set')
    ) {
      console.warn('[transcriptService] Transactions not supported; using fallback insert strategy');
      return await _commitWithFallback(draft);
    }
    throw txErr;
  }
}

async function _commitWithTransaction(draft) {
  const session = await mongoose.startSession();
  let savedProjects = [];

  try {
    await session.withTransaction(async () => {
      savedProjects = [];
      const { projects: projectDrafts } = draft;

      for (const pd of projectDrafts) {
        const project = new Project({
          name: pd.name,
          clientName: pd.clientName,
          description: pd.description || '',
          managerId: pd.managerId,
          deadline: pd.deadline,
        });
        await project.save({ session });

        for (const td of pd.tasks || []) {
          const hours =
            typeof td.estimatedHours === 'string'
              ? parseFloat(td.estimatedHours)
              : td.estimatedHours;
          const task = new Task({
            projectId: project._id,
            title: td.title,
            description: td.description || '',
            assigneeId: td.assigneeId,
            deadline: td.deadline,
            estimatedHours: hours,
          });
          await task.save({ session });
        }

        savedProjects.push({ project, taskCount: (pd.tasks || []).length, totalHours: (pd.tasks || []).reduce((s, t) => s + (parseFloat(t.estimatedHours) || 0), 0) });
      }
    });
  } finally {
    session.endSession();
  }

  return _buildCommitResponse(savedProjects);
}

async function _commitWithFallback(draft) {
  const insertedProjectIds = [];
  const insertedTaskIds = [];
  const savedProjects = [];

  try {
    for (const pd of draft.projects) {
      const project = await Project.create({
        name: pd.name,
        clientName: pd.clientName,
        description: pd.description || '',
        managerId: pd.managerId,
        deadline: pd.deadline,
      });
      insertedProjectIds.push(project._id);

      let taskCount = 0;
      let totalHours = 0;

      for (const td of pd.tasks || []) {
        const hours =
          typeof td.estimatedHours === 'string' ? parseFloat(td.estimatedHours) : td.estimatedHours;
        const task = await Task.create({
          projectId: project._id,
          title: td.title,
          description: td.description || '',
          assigneeId: td.assigneeId,
          deadline: td.deadline,
          estimatedHours: hours,
        });
        insertedTaskIds.push(task._id);
        taskCount++;
        totalHours += hours || 0;
      }

      savedProjects.push({ project, taskCount, totalHours });
    }
  } catch (err) {
    // Rollback: delete everything we inserted
    console.error('[transcriptService] Fallback insert failed, rolling back...', err.message);
    if (insertedProjectIds.length) await Project.deleteMany({ _id: { $in: insertedProjectIds } });
    if (insertedTaskIds.length) await Task.deleteMany({ _id: { $in: insertedTaskIds } });
    throw err;
  }

  return _buildCommitResponse(savedProjects);
}

function _buildCommitResponse(savedProjects) {
  let totalTasks = 0;
  let totalHours = 0;

  const projects = savedProjects.map(({ project, taskCount, totalHours: ph }) => {
    totalTasks += taskCount;
    totalHours += ph;
    return {
      id: project._id.toString(),
      name: project.name,
      clientName: project.clientName,
      managerId: project.managerId,
      deadline: project.deadline,
      taskCount,
      totalHours: ph,
    };
  });

  return {
    projects,
    totals: {
      projects: projects.length,
      tasks: totalTasks,
      hours: totalHours,
    },
  };
}

module.exports = { processDraft, commitDraft };
