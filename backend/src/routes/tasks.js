'use strict';

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { listMyTasks } = require('../services/accessService');

// GET /api/tasks/mine — AGENT only
router.get('/mine', auth, async (req, res, next) => {
  try {
    const result = await listMyTasks(req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
