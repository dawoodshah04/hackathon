# AI Module — `backend/src/ai`

This module converts a meeting transcript into a structured JSON draft of projects and tasks. It is the sole responsibility of **Member 3 (AI/ML)** and lives entirely inside `backend/src/ai/`. It has **zero npm dependencies** — only Node 22 built-ins (`fetch`, `AbortController`, `fs`, `path`).

---

## File overview

| File | Purpose |
|---|---|
| `index.js` | Public function; orchestration and retries |
| `prompt.js` | Builds system + user messages; few-shot example |
| `keyPool.js` | Parses, dedupes, and round-robins API keys; cooldown after 429 |
| `providers/groq.js` | Groq chat completion (JSON mode) |
| `providers/hf.js` | Hugging Face chat completion (fallback) |
| `parse.js` | Extracts and normalises JSON from raw model output |
| `errors.js` | `AiError` with `.code` and `.statusCode = 502` |
| `cli.js` | CLI: `--models`, `--ping`, transcript extraction |
| `evaluate.js` | Automated accuracy evaluation |
| `fixtures/` | Transcripts, directory, expected answer key |

---

## Public API

```js
const { extractProjectsFromTranscript } = require('./backend/src/ai');

const result = await extractProjectsFromTranscript({
  transcript: '...',          // full meeting text (string, required)
  directory: [...],           // [{id, name, role, specialization, skills}] (NO passwords/emails)
  meetingDate: '2026-10-07',  // default; used for date resolution
});
// result: { projects: [ { name, clientName, description, managerId, deadline, tasks: [...] } ] }
// On failure throws AiError with .code ("AI_FAILED"|"AI_BAD_OUTPUT") and .statusCode=502
```

The backend calls this via `backend/src/services/aiAdapter.js` when `AI_MODE=live`.

---

## Environment variables (`backend/.env`)

| Variable | Default | Description |
|---|---|---|
| `GROQ_API_KEYS` | *(required)* | Comma-separated Groq API keys |
| `GROQ_MODEL` | `openai/gpt-oss-120b` | Primary Groq model |
| `GROQ_FALLBACK_MODEL` | `openai/gpt-oss-20b` | Fallback Groq model |
| `HF_API_KEYS` | *(optional)* | Comma-separated HF keys (fallback provider) |
| `HF_MODEL` | `meta-llama/Llama-3.1-8B-Instruct` | HF model |
| `AI_TIMEOUT_MS` | `60000` | Per-request abort timeout in ms |

Keys are **never logged** beyond the last 4 characters.

---

## CLI

All commands use `node --env-file=backend/.env`:

```bash
# List available Groq models
node --env-file=backend/.env backend/src/ai/cli.js --models

# Ping every configured Groq key (shows OK / RATE-LIMITED / INVALID)
node --env-file=backend/.env backend/src/ai/cli.js --ping

# Run extraction on a transcript file (uses fixtures/directory.json by default)
node --env-file=backend/.env backend/src/ai/cli.js backend/src/ai/fixtures/transcript.txt

# Run with a custom directory
node --env-file=backend/.env backend/src/ai/cli.js transcript.txt --directory dir.json
```

---

## Evaluation

```bash
node --env-file=backend/.env backend/src/ai/evaluate.js
```

Runs the extractor **3 times** on each of:
- `fixtures/transcript.txt` — original meeting
- `fixtures/transcript.changed.txt` — QuickServe Mobile integration changed to 12 h / 2026-10-23

Checks per run:
- Exactly 3 projects, 12 tasks
- Correct manager, client, deadline per project
- Correct assignee, deadline, hours per task (case-insensitive title match)
- No non-directory ids; no "Kamran"
- No forbidden tasks (payment, inventory, maps, tracking, real email integration)
- For changed transcript: only Mobile integration differs (12 h, 2026-10-23)

Exits 0 on full pass, non-zero on any failure.

---

## How the pipeline works (judges may ask)

1. **Prompt design** — a system prompt with 9 explicit rules (final values win, ignore out-of-scope, one task per piece of work, null for unknowns) plus a bakery domain few-shot example showing correction handling. Temperature 0 for determinism.
2. **JSON mode** — Groq supports `response_format: { type: 'json_object' }` which forces valid JSON output. The word "JSON" appears in the prompt as required.
3. **Key rotation** — `keyPool.js` round-robins keys; a 429 response marks a key cooling for `retry-after` seconds; a 401/403 permanently skips the key.
4. **Fallback chain** — Groq primary model → Groq fallback model → Hugging Face keys. Total cap: 6 attempts, 90 s wall time; each request aborted after `AI_TIMEOUT_MS` via `AbortController`.
5. **JSON repair** — if parsing fails, one repair attempt is sent: the bad text + "Return only the JSON object". If it still fails, `AiError('AI_BAD_OUTPUT')` is thrown.
6. **Normalisation** (`parse.js`) — strips code fences, finds first balanced `{}`, parses, then: trims strings; converts `"12 hours"` → `12`; pads dates `2026-10-2` → `2026-10-02`; uppercases ids; maps person names → ids when unambiguous; drops duplicate tasks.
7. **Backend validation** — the backend (`aiAdapter.js`) validates the draft with zod before saving; the AI module intentionally leaves semantic issues (wrong id, null) for the validator to flag.

---

## Known limits

- Free Groq tier: ~14 400 tokens/minute per key; a 6k-token transcript may hit limits under rapid repeated calls — the key pool handles this automatically.
- HF fallback models may be slower and less accurate; prompt injection is mitigated by keeping HF as last resort.
- If all providers are exhausted, the user sees a `502 AI_FAILED` error (safe, no keys exposed).
- The module does not retry on HTTP 200 with bad JSON beyond one repair pass — this is intentional to stay within token budgets.

---

## Integration note for the backend teammate

`extractProjectsFromTranscript` is ready. Import it as:

```js
// backend/src/services/aiAdapter.js
const { extractProjectsFromTranscript } = require('../ai');
```

The function signature is stable. After merging, set `AI_MODE=live` in `backend/.env` and re-run `evaluate.js`.
