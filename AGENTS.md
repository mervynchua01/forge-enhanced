# AGENTS.md

Instructions for AI coding agents working in this repo. Humans: see `README.md` and the
product spec in `docs/context.md`.

## Overview
Forge turns a PRD into engineering tickets: a user submits a PRD, Claude generates a draft of
tickets, the user refines them via a tool-calling chat, then confirms to save to the project
board. Intentionally minimal: one Express backend, one LLM provider, one Postgres (Supabase).
Full spec: `docs/context.md`.

## Tech stack
- **Backend** `backend/` — Node + Express 5, ES modules (`"type": "module"`, use `import`).
  `@anthropic-ai/sdk` ^0.102, `@supabase/supabase-js`, `zod`, `ws` (streaming), `jsonwebtoken`.
- **Frontend** `frontend/` — Vite 8, React 18.3, MUI 7 + Emotion, Tailwind 4, react-router 7,
  `@dnd-kit` (kanban), axios, `@supabase/supabase-js`.
- **DB** — Supabase Postgres. Schema is `backend/db/schema.sql`.
- **LLM** — Anthropic Claude **Haiku 4.5** primary; upgrade path **Sonnet 4.6**. Prompt caching
  on system prompt, schema, and tools. Always read the `claude-api` skill before changing
  anything that calls the Anthropic SDK — don't answer model/pricing questions from memory.

## Setup & commands
No root `package.json`; backend and frontend are installed and run separately.
- Backend: `cd backend && npm install && npm run dev` (nodemon) — `npm start` for prod.
- Frontend: `cd frontend && npm install && npm run dev` (Vite).
- Lint (frontend): `cd frontend && npm run lint`.
- Env: copy `backend/.env.example` and `frontend/.env.example` to `.env`. There are no tests
  configured yet — do not claim tests pass; verify by running the app.

## Architecture
- Backend layering: `routes/` → `controllers/` → `lib/` + `models/`; `middleware/` for auth.
  - `lib/llm.js` — Anthropic calls, draft generation (native PDF document blocks for PDFs).
  - `lib/refinementTools.js` — tool definitions/handlers for chat refinement.
  - `lib/supabase.js` — Supabase client. `validation/ticketSchemas.js` — Zod ticket schemas.
  - `middleware/verifyToken.js`, `middleware/requireRole.js` — auth + RBAC.
- `agent_tasks` row drives a generation: state lifecycle is
  `generating → draft_ready → refining → confirmed | cancelled`.
- Frontend: `services/` (axios API calls), `context/AuthContext.jsx`, `lib/supabaseClient.js`,
  `lib/apiBaseUrl.js`; PRD flow in `pages/PrdImportHero.jsx` + `components/PrdRefinementPanel.jsx`.

## Code style
- ES modules everywhere in backend; match existing camelCase filenames in `controllers/`/`lib/`,
  `*Routes.js` in `routes/`. Frontend components are `PascalCase.jsx`.
- Keep comments at the density of surrounding code; explain *why*, not *what*.
- Validate all LLM output with Zod (`validation/ticketSchemas.js`); retry once on failure.

## Boundaries
**Always:** keep provider selection config-driven (no hardcoded model in business logic); log
token usage/cost per generation and per chat turn; run refinement tool calls transactionally.
**Ask first:** schema changes (`backend/db/schema.sql`), new dependencies, changing the default
model, anything touching auth/RLS.
**Never:** commit secrets or `.env`; expose `SUPABASE_SERVICE_ROLE_KEY` or `ANTHROPIC_API_KEY`
to the frontend; auto-confirm tickets without user action.

## Security
- JWT/Supabase auth on all endpoints; Supabase RLS for data access. Every endpoint enforces
  Supabase Bearer tokens.
- LLM/API keys server-side only. CORS allowlist via `FRONTEND_URL`. `PORT` is env-driven.
- Ignore the stale `bun`-template `README.md`; this project does not use Bun.
