'use strict';

/**
 * providers/groq.js
 * Sends one chat completion request to Groq's OpenAI-compatible endpoint.
 *
 * JSON mode (`response_format: { type: 'json_object' }`) is requested when the
 * model name does NOT start with "openai/" (those models don't support it).
 * The prompt already instructs every model to return raw JSON regardless.
 *
 * @param {{ key: string, model: string, messages: Array, signal: AbortSignal }} opts
 * @returns {Promise<string>} raw text from the assistant
 * @throws with .status for HTTP error codes
 */
async function chat({ key, model, messages, signal }) {
  const url = 'https://api.groq.com/openai/v1/chat/completions';

  // Some Groq-hosted models (e.g. openai/gpt-oss-*) don't support json_object mode.
  // Use it only for models known to support it (anything not under the openai/ namespace).
  const useJsonMode = !model.startsWith('openai/');

  const bodyObj = {
    model,
    messages,
    temperature: 0,
    max_tokens: 3500,
  };
  if (useJsonMode) {
    bodyObj.response_format = { type: 'json_object' };
  }

  const body = JSON.stringify(bodyObj);

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
  if (typeof text !== 'string' || !text.trim()) {
    const e = new Error('Groq: empty content in response');
    e.status = 200; // no retry — bad shape from this model
    throw e;
  }
  return text;
}

module.exports = { chat };
