'use strict';

const mongoose = require('mongoose');
const Project = require('../models/Project');
const Task = require('../models/Task');
const { getUserNames, personRef } = require('./userDirectory');

/** "YYYY-MM-DD" the project was created, read from its ObjectId (works for old documents too). */
function createdDate(project) {
  return project._id.getTimestamp().toISOString().slice(0, 10);
}

function forbidden() {
  const err = new Error('You do not have access to this project');
  err.statusCode = 403;
  err.code = 'FORBIDDEN';
  return err;
}

function notFound() {
  const err = new Error('Project not found');
  err.statusCode = 404;
  err.code = 'NOT_FOUND';
  return err;
}

/** Task count and hours per project, for the tasks matching `match`. */
function taskTotals(match) {
  return Task.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$projectId',
        taskCount: { $sum: 1 },
        totalHours: { $sum: '$estimatedHours' },
      },
    },
  ]);
}

/**
 * Returns the list of projects the given user may see,
 * with taskCount and totalHours computed only from tasks the user may see,
 * and manager:{id,name} embedded.
 *
 * Atlas is a network round trip away, so each role uses as few sequential
 * queries as possible; names come from the cached directory.
 */
async function listProjectsFor(user) {
  let projects;
  let totals;
  const namesPromise = getUserNames();

  if (user.role === 'ADMIN') {
    // Everything is visible: both queries can run at once.
    [projects, totals] = await Promise.all([Project.find({}).lean(), taskTotals({})]);
  } else if (user.role === 'MANAGER') {
    projects = await Project.find({ managerId: user._id }).lean();
    totals = projects.length ? await taskTotals({ projectId: { $in: projects.map((p) => p._id) } }) : [];
  } else {
    // AGENT: the projects are exactly those their tasks belong to, so the totals come first.
    totals = await taskTotals({ assigneeId: user._id });
    projects = totals.length ? await Project.find({ _id: { $in: totals.map((row) => row._id) } }).lean() : [];
  }

  if (projects.length === 0) return [];
  const names = await namesPromise;

  const taskMap = {};
  for (const row of totals) {
    taskMap[row._id.toString()] = { taskCount: row.taskCount, totalHours: row.totalHours };
  }

  return projects.map((p) => {
    const stats = taskMap[p._id.toString()] || { taskCount: 0, totalHours: 0 };
    return {
      id: p._id.toString(),
      name: p.name,
      clientName: p.clientName,
      description: p.description,
      deadline: p.deadline,
      createdAt: createdDate(p),
      manager: personRef(names, p.managerId),
      taskCount: stats.taskCount,
      totalHours: stats.totalHours,
    };
  });
}

/**
 * Returns a single project the user may see, plus its visible tasks.
 * Throws HTTP-style errors for 404 / 403.
 */
async function getProjectFor(user, projectId) {
  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(projectId)) throw notFound();

  const project = await Project.findById(projectId).lean();
  if (!project) throw notFound();

  // Check access
  if (user.role === 'MANAGER' && project.managerId !== user._id) throw forbidden();

  // The agent access check, the tasks and the names are independent: fetch them together.
  const [tasks, names] = await Promise.all([getTasksFor(user, project._id), getUserNames()]);

  // Agent must have at least one task in this project (their task list is already filtered to them)
  if (user.role === 'AGENT' && tasks.length === 0) throw forbidden();

  return {
    project: {
      id: project._id.toString(),
      name: project.name,
      clientName: project.clientName,
      description: project.description,
      deadline: project.deadline,
      createdAt: createdDate(project),
      manager: personRef(names, project.managerId),
    },
    tasks,
  };
}

/**
 * Returns tasks for a given project, filtered by user role.
 * Populates assignee:{id,name}.
 */
async function getTasksFor(user, projectId) {
  const filter = { projectId };
  if (user.role === 'AGENT') {
    filter.assigneeId = user._id;
  }
  // MANAGER: must manage the project (caller already checked); ADMIN: all tasks

  const [tasks, names] = await Promise.all([Task.find(filter).lean(), getUserNames()]);

  return tasks.map((t) => ({
    id: t._id.toString(),
    projectId: t.projectId.toString(),
    title: t.title,
    description: t.description,
    assignee: personRef(names, t.assigneeId),
    deadline: t.deadline,
    estimatedHours: t.estimatedHours,
  }));
}

/**
 * Slim list of every task the user may see across their projects, for the
 * dashboard charts (workload, timeline). No descriptions, to keep it small.
 */
async function listInsightsFor(user) {
  const taskFilter = {};
  if (user.role === 'AGENT') {
    taskFilter.assigneeId = user._id;
  } else if (user.role === 'MANAGER') {
    const projectIds = await Project.distinct('_id', { managerId: user._id });
    taskFilter.projectId = { $in: projectIds };
  }

  const [tasks, names] = await Promise.all([
    Task.find(taskFilter, 'projectId title assigneeId deadline estimatedHours').lean(),
    getUserNames(),
  ]);

  return {
    tasks: tasks.map((t) => ({
      id: t._id.toString(),
      projectId: t.projectId.toString(),
      title: t.title,
      assignee: personRef(names, t.assigneeId),
      deadline: t.deadline,
      estimatedHours: t.estimatedHours,
    })),
  };
}

/**
 * Returns all tasks assigned to the user (AGENT only), with project summary.
 * Sorted by deadline ascending.
 */
async function listMyTasks(user) {
  if (user.role !== 'AGENT') {
    const err = new Error('Only agents can access their task list');
    err.statusCode = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }

  const [tasks, names] = await Promise.all([
    Task.find({ assigneeId: user._id }).sort({ deadline: 1 }).lean(),
    getUserNames(),
  ]);

  // Fetch projects in one query
  const projectIds = [...new Set(tasks.map((t) => t.projectId.toString()))];
  const projects = await Project.find({
    _id: { $in: projectIds.map((id) => new mongoose.Types.ObjectId(id)) },
  }).lean();

  const projectMap = {};
  for (const p of projects) {
    projectMap[p._id.toString()] = {
      id: p._id.toString(),
      name: p.name,
      clientName: p.clientName,
      manager: personRef(names, p.managerId),
    };
  }

  const totalHours = tasks.reduce((sum, t) => sum + t.estimatedHours, 0);

  const result = tasks.map((t) => ({
    id: t._id.toString(),
    title: t.title,
    description: t.description,
    deadline: t.deadline,
    estimatedHours: t.estimatedHours,
    assignee: { id: user._id, name: user.name },
    project: projectMap[t.projectId.toString()] || { id: t.projectId.toString() },
  }));

  return { tasks: result, totalHours };
}

module.exports = { listProjectsFor, getProjectFor, getTasksFor, listMyTasks, listInsightsFor };
