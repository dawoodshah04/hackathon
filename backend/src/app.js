'use strict';

const express = require('express');
const compression = require('compression');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const env = require('./config/env');
const errorHandler = require('./middleware/errorHandler');

// Routes
const healthRouter = require('./routes/health');
const authRouter = require('./routes/auth');
const teamRouter = require('./routes/team');
const projectsRouter = require('./routes/projects');
const tasksRouter = require('./routes/tasks');
const transcriptsRouter = require('./routes/transcripts');
const insightsRouter = require('./routes/insights');

const app = express();

// CORS: allow comma-separated origins
const allowedOrigins = env.clientOrigin.split(',').map((o) => o.trim()).filter(Boolean);
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, Postman, same-origin)
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);

// Gzip JSON and static files: the biggest win on slow connections.
app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));

// API routes
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/team', teamRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/transcripts', transcriptsRouter);
app.use('/api/insights', insightsRouter);

// JSON 404 for unknown /api/* routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `No route: ${req.method} ${req.originalUrl}` } });
});

// Serve the built React frontend in production (one service)
if (env.serveFrontend) {
  const distPath = path.resolve(__dirname, '../../frontend/dist');
  // Vite fingerprints everything under /assets, so those files never change and can be cached for good.
  app.use(
    '/assets',
    express.static(path.join(distPath, 'assets'), { immutable: true, maxAge: '1y', fallthrough: false })
  );
  app.use(express.static(distPath, { maxAge: 0 }));
  // SPA fallback: any non-/api GET returns index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Central error handler (must be last)
app.use(errorHandler);

module.exports = app;
