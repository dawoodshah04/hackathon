'use strict';

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { processDraft, commitDraft } = require('../services/transcriptService');

const MAX_TRANSCRIPT_LENGTH = 30000;

// POST /api/transcripts/draft — ADMIN only
router.post('/draft', auth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const transcript = (req.body.transcript || '').trim();

    if (!transcript) {
      return res.status(400).json({
        error: { code: 'EMPTY_TRANSCRIPT', message: 'Transcript must not be empty' },
      });
    }

    if (transcript.length > MAX_TRANSCRIPT_LENGTH) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: `Transcript exceeds maximum length of ${MAX_TRANSCRIPT_LENGTH} characters`,
        },
      });
    }

    const { draft, issues } = await processDraft(transcript);
    return res.status(200).json({ draft, issues });
  } catch (err) {
    if (err.code === 'AI_FAILED' || err.statusCode === 502) {
      return res.status(502).json({
        error: { code: 'AI_FAILED', message: err.message || 'AI extraction failed' },
      });
    }
    next(err);
  }
});

// POST /api/transcripts/commit — ADMIN only
router.post('/commit', auth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { draft } = req.body || {};
    if (!draft) {
      return res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'Missing draft in request body' },
      });
    }

    const result = await commitDraft(draft, req.user._id);
    return res.status(201).json(result);
  } catch (err) {
    if (err.statusCode === 409) {
      return res.status(409).json({ error: { code: 'BUSY', message: err.message } });
    }
    if (err.statusCode === 422) {
      return res.status(422).json({
        error: { code: 'VALIDATION_FAILED', message: err.message, issues: err.issues },
      });
    }
    next(err);
  }
});

module.exports = router;
