'use strict';

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// GET /api/team — any authenticated user
router.get('/', auth, async (req, res, next) => {
  try {
    const users = await User.find({}, '-passwordHash').lean();
    // Apply toJSON transform manually since we used .lean()
    const result = users.map((u) => ({
      id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      specialization: u.specialization,
      skills: u.skills,
    }));
    res.json({ users: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
