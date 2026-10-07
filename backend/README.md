# NovaWorks Backend API

Express + Mongoose backend for the NovaWorks Technologies AI Project Manager.

## Quick Start

### 1. Install dependencies
```bash
cd backend
npm install
```

### 2. Create your `.env`
```bash
cp .env.example .env
# Edit .env and fill in:
#   MONGODB_URI  — your Atlas connection string (must include /novaworks)
#   JWT_SECRET   — any long random string
#   AI_MODE=mock — use "live" for the real demo
```

### 3. Seed demo accounts
```bash
npm run seed
```

### 4. Start dev server
```bash
npm run dev
```
Server starts on http://localhost:5000 (or your `PORT`).

### Reset projects & tasks (re-run demo)
```bash
npm run reset:work
```

### Run access tests (server must be running)
```bash
# In another terminal:
npm run test:access
# Or with a different URL:
BASE_URL=http://localhost:5000 node tests/access.test.js
```

---

## Environment Variables (`backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `MONGODB_URI` | ✅ | — | Atlas URI including database name (`/novaworks`) |
| `JWT_SECRET` | ✅ | — | Secret for signing JWTs |
| `PORT` | | 5000 | HTTP port |
| `JWT_EXPIRES_IN` | | 8h | JWT expiry |
| `CLIENT_ORIGIN` | | http://localhost:5173 | Comma-separated CORS origins |
| `SERVE_FRONTEND` | | false | Set `true` in production to serve React build |
| `AI_MODE` | | mock | `mock` (dev) or `live` (demo/prod) |
| `GROQ_API_KEYS` | | — | Comma-separated Groq API keys |
| `GROQ_MODEL` | | llama-3.3-70b-versatile | Primary Groq model |
| `GROQ_FALLBACK_MODEL` | | llama-3.1-8b-instant | Fallback Groq model |
| `HF_API_KEYS` | | — | Comma-separated HF keys |
| `HF_MODEL` | | mistralai/Mistral-7B-Instruct-v0.3 | HF model |
| `AI_TIMEOUT_MS` | | 60000 | AI request timeout |

---

## API Endpoints

All endpoints under `/api`. Auth header: `Authorization: Bearer <jwt>`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | public | Server + DB + AI mode status |
| POST | `/auth/login` | public | Login with email + password |
| GET | `/auth/me` | any | Current user profile |
| GET | `/team` | any | All users (no passwordHash) |
| GET | `/projects` | any | Role-filtered project list |
| GET | `/projects/:id` | any | Project detail + tasks (403 if out of scope) |
| GET | `/tasks/mine` | AGENT | My tasks + project summary, sorted by deadline |
| POST | `/transcripts/draft` | ADMIN | Run AI + validation, returns draft + issues (saves nothing) |
| POST | `/transcripts/commit` | ADMIN | Validate + save all projects/tasks atomically |

### Error shape
```json
{
  "error": {
    "code": "STRING_CODE",
    "message": "human readable",
    "issues": [{ "path": "projects[0].tasks[1].assigneeId", "message": "..." }]
  }
}
```

---

## Project Structure

```
backend/src/
  server.js           Entry point: load env, connect DB, listen
  app.js              Express app, middleware, routes, error handler
  config/
    env.js            Load .env, fail fast if required vars missing
    db.js             Mongoose connect
  models/
    User.js           String _id (ADMIN/PM01/.../DEV06)
    Project.js        ObjectId, managerId -> User
    Task.js           ObjectId, projectId -> Project, assigneeId -> User
  middleware/
    auth.js           Verify JWT, reload user from DB
    requireRole.js    Role-based access control factory
    errorHandler.js   Central error handler
  routes/
    health.js         GET /api/health
    auth.js           POST /api/auth/login, GET /api/auth/me
    team.js           GET /api/team
    projects.js       GET /api/projects, GET /api/projects/:id
    tasks.js          GET /api/tasks/mine
    transcripts.js    POST /api/transcripts/draft, POST /api/transcripts/commit
  services/
    accessService.js  All role-based data access (no N+1 queries)
    transcriptService.js  Draft + commit logic, per-user lock, transaction
    aiAdapter.js      Lazy-loads ../ai when AI_MODE=live
    mockDraft.js      Fixed dev draft (AI_MODE=mock only)
  validation/
    draftValidator.js  Zod shape + custom rules (real dates, role checks, hour coercion)
  seed/
    demoUsers.js      10 demo account definitions
    run.js            npm run seed / npm run reset:work
backend/tests/
  access.test.js      Plain Node fetch test suite (20 assertions)
  fixtures/
    answerKeyDraft.json  Answer-key draft for seeding tests
```

---

## Demo accounts (password: `Demo123!`)

| Email | Role | Notes |
|---|---|---|
| admin@novaworks.example | ADMIN | Can use transcript endpoints |
| ayesha@novaworks.example | MANAGER | Sees only UrbanCart |
| bilal@novaworks.example | MANAGER | Sees only QuickServe |
| hina@novaworks.example | MANAGER | Sees only HelpDeskPro |
| ali@novaworks.example | AGENT | 3 tasks in UrbanCart |
| hamza@novaworks.example | AGENT | 2 tasks across 2 projects |
| sara@novaworks.example | AGENT | QuickServe tasks |
| usman@novaworks.example | AGENT | QuickServe testing |
| zain@novaworks.example | AGENT | HelpDeskPro AI tasks |
| maryam@novaworks.example | AGENT | HelpDeskPro tasks |

---

## Integration (T+90)

When the `feat/ai` branch is merged:
1. Set `AI_MODE=live` in `backend/.env`
2. Add your `GROQ_API_KEYS` and optionally `HF_API_KEYS`
3. Test: `POST /api/transcripts/draft` with the real transcript
4. If the AI module's output doesn't match the contract, report to the AI teammate (do not edit `backend/src/ai`)
