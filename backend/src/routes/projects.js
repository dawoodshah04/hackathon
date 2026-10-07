'use strict';

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { listProjectsFor, getProjectFor } = require('../services/accessService');

// GET /api/projects — filtered by role
router.get('/', auth, async (req, res, next) => {
  try {
    const projects = await listProjectsFor(req.user);
    res.json({ projects });
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/:id — 404 if not found, 403 if out of scope
router.get('/:id', auth, async (req, res, next) => {
  try {
    const result = await getProjectFor(req.user, req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
