# NovaWorks Projects: frontend

React 18 + Vite + Tailwind CSS v4 client for the AI Project Manager. It talks to the
Express API described in the shared contract (`/api`, JWT bearer auth).

## Run

```bash
npm install
cp .env.example .env    # then set VITE_USE_MOCK=true to work without the backend
npm run dev             # http://localhost:5173, /api is proxied to http://localhost:5000
npm run build           # production bundle in dist/
npm run lint
```

| Variable | Meaning |
|---|---|
| `VITE_API_URL` | API origin. Empty means same origin (Vite proxy in dev, Render in production). |
| `VITE_USE_MOCK` | `true` swaps in the in-browser mock API. Production builds with it off contain no mock code or data. |
| `VITE_PROXY_TARGET` | Dev-server proxy target for `/api`; must match the backend `PORT`. Defaults to `http://localhost:5000`. |

## Structure

```
src/
  api/          client.js   axios instance, token storage, ApiError { status, code, message, issues }
                real.js     one function per contract endpoint
                mock.js     same functions in-browser: role filtering, validation, error codes
                index.js    exports real or mock by VITE_USE_MOCK
  context/      AuthContext session bootstrap (/auth/me), sign in/out, 401 handling
  components/   UI building blocks; transcript/ holds the draft review flow
  pages/        one file per route
  lib/          formatting (dates stay "YYYY-MM-DD" strings, never Date-parsed), draft path helpers
```

## Behaviour worth knowing

- **Access control is the API's job.** Hidden links and role-gated routes are only UX; every
  screen renders whatever the API returns for the signed-in user. A 403 and a 404 on a project
  show the same "no access" screen so the UI never confirms a project exists.
- **Any 401** (except a wrong password on sign-in) clears the token and returns to sign-in.
- **Transcript flow:** `POST /transcripts/draft` → if `issues` is empty, `POST /transcripts/commit`
  runs straight away. Otherwise the draft opens in an editor where each issue `path`
  (`projects[0].tasks[2].assigneeId`) highlights its field. Saving re-runs server validation; a 422
  refreshes the issue list. Tasks or projects the AI shouldn't have created can be removed (with undo).

## Mock mode triggers

With `VITE_USE_MOCK=true`, sign in with any demo account (password `Demo123!`). In the transcript:

- `TEST_ISSUES` returns a draft with an unassigned task and a task due after its project.
- `TEST_AI_FAIL` returns `502 AI_FAILED`.

Mock data lives in `localStorage` (`nw_mock_db_v1`); delete that key to reset it.
