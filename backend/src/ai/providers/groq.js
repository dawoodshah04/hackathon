'use strict';

/**
 * providers/groq.js
 * Sends one chat completion request to Groq's OpenAI-compatible endpoint.
 *
 * @param {{ key: string, model: string, messages: Array, signal: AbortSignal }} opts
 * @returns {Promise<string>} raw text from the assistant
 * @throws with .status for HTTP error codes
 */
async function chat({ key, model, messages, signal }) {
  const url = 'https://api.groq.com/openai/v1/chat/completions';

  const body = JSON.stringify({
    model,
    messages,
    temperature: 0,
    max_tokens: 3500,
    response_format: { type: 'json_object' },
  });

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body,
      signal,
    });
  } catch (err) {
    // Network error or abort
    const e = new Error(err.message || 'Network error');
    e.status = 0; // signals retry
    throw e;
  }

  if (!res.ok) {
    let retryAfter = null;
    if (res.status === 429) {
      retryAfter = parseInt(res.headers.get('retry-after') || '60', 10);
    }
    const e = new Error(`Groq HTTP ${res.status}`);
    e.status = res.status;
    e.retryAfter = retryAfter;
    throw e;
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== 'string') {
    const e = new Error('Groq: empty content in response');
    e.status = 200; // no retry — bad shape
    throw e;
  }
  return text;
}

module.exports = { chat };
