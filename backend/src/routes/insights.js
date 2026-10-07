'use strict';

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { listInsightsFor } = require('../services/accessService');

// GET /api/insights — slim task list for charts, scoped like the rest of the API
router.get('/', auth, async (req, res, next) => {
  try {
    res.json(await listInsightsFor(req.user));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
