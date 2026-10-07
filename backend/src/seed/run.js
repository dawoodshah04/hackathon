'use strict';

require('../config/env');
const { connectDB } = require('../config/db');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const demoUsers = require('./demoUsers');

const DEMO_PASSWORD = 'Demo123!';
const SALT_ROUNDS = 10;

async function resetWork() {
  const [projects, tasks] = await Promise.all([
    Project.deleteMany({}),
    Task.deleteMany({}),
  ]);
  console.log(`[seed] reset:work — deleted ${projects.deletedCount} projects, ${tasks.deletedCount} tasks`);
}

async function seedUsers() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, SALT_ROUNDS);
  let created = 0;
  let updated = 0;

  for (const u of demoUsers) {
    const result = await User.findOneAndUpdate(
      { _id: u._id },
      { ...u, passwordHash },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    if (result) {
      // Check if it was newly inserted or updated
      const exists = await User.exists({ _id: u._id });
      if (exists) updated++;
    }
  }

  // More accurate count: just report totals
  const total = await User.countDocuments();
  console.log(`[seed] Users: ${total} total in DB (${demoUsers.length} upserted)`);
}

async function main() {
  await connectDB();

  const args = process.argv.slice(2);
  const isResetWork = args.includes('--reset-work');

  if (isResetWork) {
    await resetWork();
  } else {
    await seedUsers();
    const userCount = await User.countDocuments();
    const projectCount = await Project.countDocuments();
    const taskCount = await Task.countDocuments();
    console.log(`[seed] Summary — Users: ${userCount}, Projects: ${projectCount}, Tasks: ${taskCount}`);
    console.log(`[seed] Done. All users have password: ${DEMO_PASSWORD}`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('[seed] Fatal error:', err.message);
  process.exit(1);
});
