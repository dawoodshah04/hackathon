'use strict';

const dotenv = require('dotenv');
const path = require('path');

// Load from backend/.env regardless of where the process is started from
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const required = ['MONGODB_URI', 'JWT_SECRET'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`[config/env] FATAL: missing required env vars: ${missing.join(', ')}`);
  process.exit(1);
}

module.exports = {
  port: parseInt(process.env.PORT || '5000', 10),
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  serveFrontend: process.env.SERVE_FRONTEND === 'true',
  aiMode: process.env.AI_MODE || 'live',
  groqApiKeys: (process.env.GROQ_API_KEYS || '').split(',').filter(Boolean),
  groqModel: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
  groqFallbackModel: process.env.GROQ_FALLBACK_MODEL || 'openai/gpt-oss-20b',
  hfApiKeys: (process.env.HF_API_KEYS || '').split(',').filter(Boolean),
  hfModel: process.env.HF_MODEL || 'mistralai/Mistral-7B-Instruct-v0.3',
  aiTimeoutMs: parseInt(process.env.AI_TIMEOUT_MS || '60000', 10),
};
