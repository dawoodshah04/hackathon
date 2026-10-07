'use strict';

/**
 * keyPool.js - parse, dedupe, rotate, and mask API keys.
 *
 * Usage:
 *   const pool = createPool(process.env.GROQ_API_KEYS);
 *   const key = pool.next();   // round-robin; null if all cooling
 *   pool.markCooling(key, retryAfterSeconds);  // after 429
 *   pool.markBad(key);         // after 401/403
 *   pool.mask(key);            // returns last 4 chars for logging
 */

/**
 * @param {string|undefined} envValue  comma-separated keys
 * @returns {{ next(): string|null, markCooling(key: string, secs?: number): void, markBad(key: string): void, mask(key: string): string, size: number }}
 */
function createPool(envValue) {
  // Parse, deduplicate, and filter blank entries
  const raw = (envValue || '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);

  const seen = new Set();
  const keys = [];
  for (const k of raw) {
    if (!seen.has(k)) {
      seen.add(k);
      keys.push(k);
    }
  }

  // Per-key state
  const state = new Map(keys.map((k) => [k, { bad: false, coolUntil: 0 }]));

  let idx = 0;

  /** Return the next available key in round-robin order, or null if none. */
  function next() {
    const now = Date.now();
    const start = idx;
    for (let i = 0; i < keys.length; i++) {
      const candidate = keys[(start + i) % keys.length];
      const s = state.get(candidate);
      if (!s.bad && now >= s.coolUntil) {
        idx = (start + i + 1) % keys.length;
        return candidate;
      }
    }
    return null; // all cooling or bad
  }

  /** Mark key as cooling after a 429 response. */
  function markCooling(key, retryAfterSeconds = 60) {
    const s = state.get(key);
    if (s) {
      s.coolUntil = Date.now() + retryAfterSeconds * 1000;
    }
  }

  /** Permanently skip this key (401/403). */
  function markBad(key) {
    const s = state.get(key);
    if (s) s.bad = true;
  }

  /** Safe log representation: only last 4 chars. */
  function mask(key) {
    if (!key || key.length < 4) return '****';
    return `...${key.slice(-4)}`;
  }

  return { next, markCooling, markBad, mask, size: keys.length };
}

module.exports = { createPool };
