'use strict';

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const auth = require('../middleware/auth');
const env = require('../config/env');

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const GENERIC_MSG = 'Invalid email or password';

    if (!email || !password) {
      return res.status(401).json({
        error: { code: 'INVALID_CREDENTIALS', message: GENERIC_MSG },
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({
        error: { code: 'INVALID_CREDENTIALS', message: GENERIC_MSG },
      });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({
        error: { code: 'INVALID_CREDENTIALS', message: GENERIC_MSG },
      });
    }

    const token = jwt.sign({ sub: user._id }, env.jwtSecret, {
      expiresIn: env.jwtExpiresIn,
    });

    const userJson = user.toJSON();
    return res.json({
      token,
      user: {
        id: userJson.id,
        name: userJson.name,
        email: userJson.email,
        role: userJson.role,
        specialization: userJson.specialization,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', auth, (req, res) => {
  const u = req.user.toJSON();
  res.json({
    user: {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      specialization: u.specialization,
    },
  });
});

module.exports = router;
