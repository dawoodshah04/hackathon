'use strict';

/**
 * AiError - wraps AI pipeline failures with a stable code and statusCode.
 * code: "AI_FAILED"     - every provider failed (network, rate-limit exhaustion, etc.)
 * code: "AI_BAD_OUTPUT" - provider responded but output could not be parsed/repaired
 * statusCode: 502 - always, so the backend can map it to HTTP 502
 */
class AiError extends Error {
  /**
   * @param {'AI_FAILED'|'AI_BAD_OUTPUT'} code
   * @param {string} [message]
   */
  constructor(code, message) {
    const defaults = {
      AI_FAILED:
        'The AI service is temporarily unavailable. Please try again in a moment.',
      AI_BAD_OUTPUT:
        'The AI returned an unexpected response. Please try again.',
    };
    super(message || defaults[code] || 'AI error');
    this.name = 'AiError';
    this.code = code;
    this.statusCode = 502;
    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

module.exports = { AiError };
