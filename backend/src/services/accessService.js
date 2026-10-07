'use strict';

const mongoose = require('mongoose');
const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');

/**
 * Returns the list of projects the given user may see,
 * with taskCount and totalHours computed only from tasks the user may see,
 * and manager:{id,name} embedded.
 *
 * No N+1: uses aggregation or two queries per role.
 */
async function listProjectsFor(user) {
  // Step 1: determine which project ids the user may access
  let projectIds = null; // null = all

  if (user.role === 'ADMIN') {
    projectIds = null; // all
  } else if (user.role === 'MANAGER') {
    const projects = await Project.find({ managerId: user._id }, '_id').lean();
    projectIds = projects.map((p) => p._id);
  } else {
    // AGENT: projects that have at least one task assigned to them
    const tasks = await Task.find({ assigneeId: user._id }, 'projectId').lean();
    const uniqueIds = [...new Set(tasks.map((t) => t.projectId.toString()))];
    projectIds = uniqueIds.map((id) => new mongoose.Types.ObjectId(id));
  }

  // Step 2: build task aggregation pipeline filter
  const taskMatchStage =
    user.role === 'ADMIN'
      ? {}
      : user.role === 'MANAGER'
      ? { assigneeId: { $exists: true } } // manager sees all tasks in their projects
      : { assigneeId: user._id }; // agent sees only their own tasks

  // Step 3: aggregate projects with per-user task counts and hours
  const projectFilter = projectIds === null ? {} : { _id: { $in: projectIds } };

  // Fetch projects
  const projects = await Project.find(projectFilter).lean();

  if (projects.length === 0) return [];

  const projectIdList = projects.map((p) => p._id);

  // Build task aggregation
  const taskAgg = await Task.aggregate([
    {
      $match: {
        projectId: { $in: projectIdList },
        ...(user.role === 'AGENT' ? { assigneeId: user._id } : {}),
      },
    },
    {
      $group: {
        _id: '$projectId',
        taskCount: { $sum: 1 },
        totalHours: { $sum: '$estimatedHours' },
      },
    },
  ]);

  const taskMap = {};
  for (const row of taskAgg) {
    taskMap[row._id.toString()] = { taskCount: row.taskCount, totalHours: row.totalHours };
  }

  // Fetch all managers at once (no N+1)
  const managerIds = [...new Set(projects.map((p) => p.managerId))];
  const managers = await User.find({ _id: { $in: managerIds } }, '_id name').lean();
  const managerMap = {};
  for (const m of managers) {
    managerMap[m._id] = m.name;
  }

  return projects.map((p) => {
    const stats = taskMap[p._id.toString()] || { taskCount: 0, totalHours: 0 };
    return {
      id: p._id.toString(),
      name: p.name,
      clientName: p.clientName,
      description: p.description,
      deadline: p.deadline,
      manager: { id: p.managerId, name: managerMap[p.managerId] || '' },
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
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    const err = new Error('Project not found');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const project = await Project.findById(projectId).lean();
  if (!project) {
    const err = new Error('Project not found');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  // Check access
  if (user.role === 'MANAGER' && project.managerId !== user._id) {
    const err = new Error('You do not have access to this project');
    err.statusCode = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }

  if (user.role === 'AGENT') {
    // Agent must have at least one task in this project
    const hasTask = await Task.exists({ projectId: project._id, assigneeId: user._id });
    if (!hasTask) {
      const err = new Error('You do not have access to this project');
      err.statusCode = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }
  }

  // Fetch manager name
  const manager = await User.findById(project.managerId, '_id name').lean();

  const tasks = await getTasksFor(user, project._id);

  return {
    project: {
      id: project._id.toString(),
      name: project.name,
      clientName: project.clientName,
      description: project.description,
      deadline: project.deadline,
      manager: { id: project.managerId, name: manager ? manager.name : '' },
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

  const tasks = await Task.find(filter).lean();

  // Fetch assignees in one query (no N+1)
  const assigneeIds = [...new Set(tasks.map((t) => t.assigneeId))];
  const assignees = await User.find({ _id: { $in: assigneeIds } }, '_id name').lean();
  const assigneeMap = {};
  for (const a of assignees) {
    assigneeMap[a._id] = a.name;
  }

  return tasks.map((t) => ({
    id: t._id.toString(),
    projectId: t.projectId.toString(),
    title: t.title,
    description: t.description,
    assignee: { id: t.assigneeId, name: assigneeMap[t.assigneeId] || '' },
    deadline: t.deadline,
    estimatedHours: t.estimatedHours,
  }));
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

  const tasks = await Task.find({ assigneeId: user._id }).sort({ deadline: 1 }).lean();

  // Fetch projects in one query
  const projectIds = [...new Set(tasks.map((t) => t.projectId.toString()))];
  const projects = await Project.find({
    _id: { $in: projectIds.map((id) => new mongoose.Types.ObjectId(id)) },
  }).lean();

  // Fetch managers for those projects
  const managerIds = [...new Set(projects.map((p) => p.managerId))];
  const managers = await User.find({ _id: { $in: managerIds } }, '_id name').lean();
  const managerMap = {};
  for (const m of managers) managerMap[m._id] = m.name;

  const projectMap = {};
  for (const p of projects) {
    projectMap[p._id.toString()] = {
      id: p._id.toString(),
      name: p.name,
      clientName: p.clientName,
      manager: { id: p.managerId, name: managerMap[p.managerId] || '' },
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

module.exports = { listProjectsFor, getProjectFor, getTasksFor, listMyTasks };
