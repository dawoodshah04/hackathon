'use strict';

const env = require('../config/env');
const mockDraft = require('./mockDraft');

/**
 * Calls the AI module to extract a project draft from a meeting transcript.
 * When AI_MODE=mock, returns the fixed development draft.
 * When AI_MODE=live, lazily requires ../ai (may not exist until the AI branch is merged).
 *
 * @param {{ transcript: string, directory: Array }} params
 * @returns {Promise<{ projects: Array }>}
 * @throws  Error with .code='AI_FAILED' and .statusCode=502 on AI failures
 */
async function extractDraft({ transcript, directory }) {
  if (env.aiMode !== 'live') {
    console.warn(
      '\n⚠️  WARNING: AI_MODE=mock — returning fixed development draft, NOT real AI output.\n' +
      '   Set AI_MODE=live in backend/.env before the demo.\n'
    );
    return mockDraft();
  }

  // Lazy require: the AI module lives in ../ai (feat/ai branch). 
  // This import will fail gracefully if the branch hasn't been merged yet.
  let aiModule;
  try {
    // path is relative to this file: src/services/ -> src/ai/
    aiModule = require('../ai');
  } catch (requireErr) {
    console.error('[aiAdapter] Failed to load ../ai module:', requireErr.message);
    const err = new Error('AI module is not available. Has the feat/ai branch been merged?');
    err.code = 'AI_FAILED';
    err.statusCode = 502;
    throw err;
  }

  try {
    const result = await aiModule.extractProjectsFromTranscript({
      transcript,
      directory,
      meetingDate: '2026-10-07',
    });
    return result;
  } catch (aiErr) {
    // Re-map AI errors to 502
    console.error('[aiAdapter] AI extraction failed:', aiErr.message);
    const err = new Error(aiErr.message || 'AI extraction failed');
    err.code = aiErr.code || 'AI_FAILED';
    err.statusCode = aiErr.statusCode || 502;
    throw err;
  }
}

module.exports = { extractDraft };
