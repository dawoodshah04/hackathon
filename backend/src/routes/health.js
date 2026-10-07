'use strict';

const express = require('express');
const router = express.Router();

const env = require('../config/env');
const mongoose = require('mongoose');

router.get('/', (req, res) => {
  const dbState = mongoose.connection.readyState;
  // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const dbStatus = dbState === 1 ? 'connected' : 'disconnected';

  res.json({
    ok: true,
    db: dbStatus,
    aiMode: env.aiMode,
  });
});

module.exports = router;
