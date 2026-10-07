#!/usr/bin/env node
'use strict';

/**
 * cli.js - Command-line interface for the AI module.
 *
 * Usage (run from repo root with an env file):
 *   node --env-file=backend/.env backend/src/ai/cli.js --models
 *   node --env-file=backend/.env backend/src/ai/cli.js --ping
 *   node --env-file=backend/.env backend/src/ai/cli.js <transcript.txt> [--directory <dir.json>]
 *
 * --models   List available Groq models for the first key
 * --ping     Send a tiny completion with every Groq key; report OK/rate-limited/invalid
 * <file>     Run extraction on the transcript file and print the draft JSON
 */

const fs = require('fs');
const path = require('path');
const { createPool } = require('./keyPool');
const { extractProjectsFromTranscript } = require('./index');

const args = process.argv.slice(2);

async function listModels() {
  const groqPool = createPool(process.env.GROQ_API_KEYS);
  const key = groqPool.next();
  if (!key) {
    console.error('No GROQ_API_KEYS configured.');
    process.exit(1);
  }
  console.log(`Fetching models with key ...${groqPool.mask(key).slice(-4)} ...`);
  const res = await fetch('https://api.groq.com/openai/v1/models', {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!res.ok) {
    console.error(`HTTP ${res.status}`);
    process.exit(1);
  }
  const data = await res.json();
  const models = (data.data || [])
    .map((m) => m.id)
    .sort();
  console.log('\nAvailable Groq models:');
  models.forEach((m) => console.log(' ', m));
  console.log(`\nTotal: ${models.length}`);
}

async function pingKeys() {
  const groqPool = createPool(process.env.GROQ_API_KEYS);
  if (groqPool.size === 0) {
    console.error('No GROQ_API_KEYS configured.');
    process.exit(1);
  }

  const model = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
  const keys = (process.env.GROQ_API_KEYS || '').split(',').map((k) => k.trim()).filter(Boolean);
  const seen = new Set();
  const unique = keys.filter((k) => seen.has(k) ? false : seen.add(k));

  console.log(`Pinging ${unique.length} key(s) with model: ${model}\n`);

  for (const key of unique) {
    const suffix = `...${key.slice(-4)}`;
    const start = Date.now();
    try {
      const useJsonMode = !model.startsWith('openai/');
      const bodyObj = {
        model,
        messages: [{ role: 'user', content: 'Return only this JSON object: {"ok":true}' }],
        temperature: 0,
        max_tokens: 256, // reasoning models (gpt-oss) spend tokens thinking before answering
      };
      if (useJsonMode) bodyObj.response_format = { type: 'json_object' };

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify(bodyObj),
      });
      const ms = Date.now() - start;
      if (res.status === 200) {
        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content;
        if (!content || !content.trim()) {
          console.log(`  ${suffix}  EMPTY RESPONSE (model may not be usable for text)`);
        } else {
          console.log(`  ${suffix}  OK  (${ms}ms)  response="${content.slice(0, 40)}"`);
        }
      } else if (res.status === 429) {
        const ra = res.headers.get('retry-after');
        console.log(`  ${suffix}  RATE-LIMITED  retry-after=${ra || '?'}s`);
      } else if (res.status === 401 || res.status === 403) {
        console.log(`  ${suffix}  INVALID (${res.status})`);
      } else {
        console.log(`  ${suffix}  HTTP ${res.status}`);
      }
    } catch (err) {
      console.log(`  ${suffix}  NETWORK ERROR: ${err.message}`);
    }
  }
}

async function runExtraction(transcriptFile, directoryFile) {
  if (!fs.existsSync(transcriptFile)) {
    console.error(`File not found: ${transcriptFile}`);
    process.exit(1);
  }
  const transcript = fs.readFileSync(transcriptFile, 'utf8');

  let directory;
  if (directoryFile) {
    if (!fs.existsSync(directoryFile)) {
      console.error(`Directory file not found: ${directoryFile}`);
      process.exit(1);
    }
    directory = JSON.parse(fs.readFileSync(directoryFile, 'utf8'));
  } else {
    // Default to fixtures/directory.json relative to this file
    const defaultDir = path.join(__dirname, 'fixtures', 'directory.json');
    if (fs.existsSync(defaultDir)) {
      directory = JSON.parse(fs.readFileSync(defaultDir, 'utf8'));
    } else {
      console.error('No directory file provided and fixtures/directory.json not found.');
      process.exit(1);
    }
  }

  console.error('[ai] Running extraction...');
  const result = await extractProjectsFromTranscript({
    transcript,
    directory,
    meetingDate: '2026-10-07',
  });
  // Print compact JSON to stdout so it can be piped
  process.stdout.write(JSON.stringify(result) + '\n');
}

(async () => {
  try {
    if (args.includes('--models')) {
      await listModels();
    } else if (args.includes('--ping')) {
      await pingKeys();
    } else {
      const fileArg = args.find((a) => !a.startsWith('--'));
      if (!fileArg) {
        console.error('Usage: cli.js --models | --ping | <transcript.txt> [--directory <dir.json>]');
        process.exit(1);
      }
      const dirIdx = args.indexOf('--directory');
      const dirArg = dirIdx !== -1 ? args[dirIdx + 1] : null;
      await runExtraction(fileArg, dirArg);
    }
  } catch (err) {
    console.error('[ai] Fatal:', err.message);
    process.exit(1);
  }
})();
