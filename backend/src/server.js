'use strict';

// Load env and connect DB first, then start server
require('./config/env');
const { connectDB } = require('./config/db');
const app = require('./app');
const env = require('./config/env');

async function start() {
  await connectDB();
  app.listen(env.port, () => {
    console.log(`[server] NovaWorks API listening on http://localhost:${env.port}`);
    console.log(`[server] AI_MODE=${env.aiMode} | SERVE_FRONTEND=${env.serveFrontend}`);
  });
}

start().catch((err) => {
  console.error('[server] Fatal startup error:', err.message);
  process.exit(1);
});
