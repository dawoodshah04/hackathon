'use strict';

/**
 * index.js - Public AI module entry point.
 *
 * Exports: extractProjectsFromTranscript({ transcript, directory, meetingDate })
 *
 * Orchestration order:
 *   1. All Groq keys (round-robin) with GROQ_MODEL
 *   2. All Groq keys with GROQ_FALLBACK_MODEL
 *   3. All HF keys with HF_MODEL
 *
 * Each attempt:
 *   - Aborted after AI_TIMEOUT_MS (default 60000)
 *   - On 429: mark key cooling, move to next
 *   - On 401/403: mark key bad, skip permanently
 *   - On 5xx/network/timeout: try next key
 *   - On bad JSON: ONE repair attempt on same key/model, then move on
 *
 * Total attempts capped at MAX_ATTEMPTS (6); total wall time ~90 s.
 */

const { createPool } = require('./keyPool');
const { buildMessages, buildRepairMessages } = require('./prompt');
const { parseAndNormalise } = require('./parse');
const { AiError } = require('./errors');
const groqProvider = require('./providers/groq');
const hfProvider = require('./providers/hf');

const MAX_ATTEMPTS = 6;
const TOTAL_TIMEOUT_MS = 90_000;

/** Concise log line per attempt (never logs full key). */
function logAttempt(provider, model, keySuffix, status, ms) {
  console.log(`[ai] ${provider} ${model} key=...${keySuffix} status=${status} ${ms}ms`);
}

/**
 * Send one request with a single provider function, return parsed draft.
 * Returns null if the attempt should be skipped silently.
 * Throws AiError on definitive failure (bad output after repair).
 */
async function attempt({ providerFn, key, model, messages, directory, timeoutMs, pool, providerName }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();

  let rawText;
  try {
    rawText = await providerFn.chat({ key, model, messages, signal: controller.signal });
  } catch (err) {
    clearTimeout(timer);
    const ms = Date.now() - start;
    const st = err.status ?? 'ERR';
    logAttempt(providerName, model, key.slice(-4), st, ms);

    if (err.status === 429) {
      pool.markCooling(key, err.retryAfter || 60);
      return null; // try next key
    }
    if (err.status === 401 || err.status === 403) {
      pool.markBad(key);
      return null;
    }
    // network / timeout / 5xx — skip this key
    return null;
  }
  clearTimeout(timer);
  const ms = Date.now() - start;
  logAttempt(providerName, model, key.slice(-4), 200, ms);

  // Try to parse
  try {
    return parseAndNormalise(rawText, directory);
  } catch (parseErr) {
    // ONE repair attempt
    console.log(`[ai] parse error: ${parseErr.message} — attempting repair`);
    const repairMessages = buildRepairMessages(messages, rawText, parseErr.message);

    const ctrl2 = new AbortController();
    const timer2 = setTimeout(() => ctrl2.abort(), timeoutMs);
    const start2 = Date.now();
    let rawText2;
    try {
      rawText2 = await providerFn.chat({ key, model, messages: repairMessages, signal: ctrl2.signal });
    } catch (err2) {
      clearTimeout(timer2);
      logAttempt(providerName, `${model}(repair)`, key.slice(-4), err2.status ?? 'ERR', Date.now() - start2);
      return null; // give up this key
    }
    clearTimeout(timer2);
    logAttempt(providerName, `${model}(repair)`, key.slice(-4), 200, Date.now() - start2);

    try {
      return parseAndNormalise(rawText2, directory);
    } catch (parseErr2) {
      throw new AiError('AI_BAD_OUTPUT', `Could not parse AI response after repair: ${parseErr2.message}`);
    }
  }
}

/**
 * Main exported function.
 *
 * @param {{ transcript: string, directory: Array, meetingDate?: string }} opts
 * @returns {Promise<{ projects: Array }>}
 */
async function extractProjectsFromTranscript({ transcript, directory, meetingDate = '2026-10-07' }) {
  // Validate inputs
  if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
    throw new AiError('AI_FAILED', 'Transcript must be a non-empty string.');
  }
  if (!Array.isArray(directory)) {
    throw new AiError('AI_FAILED', 'Directory must be an array.');
  }

  const timeoutMs = parseInt(process.env.AI_TIMEOUT_MS || '60000', 10);

  const groqModel = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
  const groqFallback = process.env.GROQ_FALLBACK_MODEL || 'openai/gpt-oss-20b';
  const hfModel = process.env.HF_MODEL || 'meta-llama/Llama-3.1-8B-Instruct';

  const groqPool = createPool(process.env.GROQ_API_KEYS);
  const hfPool = createPool(process.env.HF_API_KEYS);

  const messages = buildMessages({ transcript, directory, meetingDate });

  const wallStart = Date.now();
  let attempts = 0;

  /**
   * Helper: try one provider+model+pool combination.
   * Returns draft on success, null if we should move to next combination.
   */
  async function tryPool(pool, providerFn, model, providerName) {
    // Try every available key in the pool
    while (attempts < MAX_ATTEMPTS && Date.now() - wallStart < TOTAL_TIMEOUT_MS) {
      const key = pool.next();
      if (!key) break; // all keys cooling or bad

      attempts++;
      try {
        const draft = await attempt({
          providerFn,
          key,
          model,
          messages,
          directory,
          timeoutMs,
          pool,
          providerName,
        });
        if (draft) return draft;
      } catch (err) {
        if (err instanceof AiError) throw err; // propagate AI_BAD_OUTPUT
        // unexpected — log and continue
        console.error('[ai] unexpected error:', err.message);
      }
    }
    return null;
  }

  // 1. Groq primary model
  if (groqPool.size > 0) {
    const draft = await tryPool(groqPool, groqProvider, groqModel, 'groq');
    if (draft) return draft;
  }

  // 2. Groq fallback model (reuse the same pool — keys may have cooled)
  if (groqPool.size > 0 && groqFallback && groqFallback !== groqModel) {
    // Reset pool index attempt with fallback model
    const draftFb = await tryPool(groqPool, groqProvider, groqFallback, 'groq-fallback');
    if (draftFb) return draftFb;
  }

  // 3. Hugging Face
  if (hfPool.size > 0) {
    const draftHf = await tryPool(hfPool, hfProvider, hfModel, 'hf');
    if (draftHf) return draftHf;
  }

  throw new AiError('AI_FAILED');
}

module.exports = { extractProjectsFromTranscript };
