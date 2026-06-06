# Forge AI Ticket Generation Context

## Overview
Forge adds AI-powered ticket generation and refinement for PRDs. A user submits a PRD, the system generates a first draft of tickets, and the user refines them via chat before confirming to save to the project board. The architecture is intentionally minimal: one backend service, one LLM provider, one database.

## Goals
- Reduce PRD-to-ticket time to under 5 minutes for typical inputs.
- Produce tickets that match the existing Forge tasks schema and conventions.
- Provide a conversational refinement flow with tool-based edits.
- Ensure observability, debuggability, and cost tracking.

## Non-goals
- Replace human review or auto-confirm tickets.
- Generate code or design artifacts.
- Auto-assign sprints, dates, or deadlines without explicit user input.
- Support non-text PRDs (images, audio, video) in v1.
- Multi-agent coordination (deferred).

## Users
- PM: submits PRD, refines draft, confirms tickets.
- EM: reviews AI output, adjusts priority or assignment.
- Engineering IC: consumes well-formed tickets with acceptance criteria.

## Key Flows
### PRD ingestion and first-draft generation
1. User pastes or uploads PRD text.
2. Backend creates an agent_tasks row and calls the LLM.
3. LLM returns structured JSON matching the tasks schema.
4. Response is validated; on failure, retry once with stricter prompt.
5. Draft tickets appear in preview for review or refinement.

### Conversational refinement
1. User opens chat alongside the draft preview.
2. User gives instructions (bulk edit, split, merge, reorder).
3. LLM calls tools to modify the draft transactionally.
4. Draft preview updates; assistant summarizes changes.
5. User confirms to save tickets to tasks table.

## Architecture
### Components
- React frontend
- Express API (generation, refinement chat, save tickets, trace)
- LLM provider (Anthropic Claude primary; config-based provider swap)
- Supabase Postgres

### Data model
- projects: project metadata
- users: team members
- tasks: finalized tickets (manual or AI-generated)
- comments: task comments
- agent_tasks: PRD content, draft_tickets (jsonb), chat_history (jsonb), state

## Phase 1 Migration Notes
- Supabase Postgres replaces MongoDB; schema is defined in backend/db/schema.sql.
- Auth uses Supabase Auth; access tokens are sent as Bearer tokens to the backend.
- Profiles live in users table keyed by auth.users.id.
- projects.members and tasks.assignees use uuid[] to keep initial migration simple.

### agent_tasks state lifecycle
- generating
- draft_ready
- refining
- confirmed
- cancelled

## Draft Ticket Shape (Core Fields)
- title
- description
- acceptance_criteria (array)
- type (Bug, Feature, Improvement)
- priority
- suggested_assignee (optional)
- clarification_flags (optional)
- source: ai-generated
- generation_task_id

## Must-have Requirements
### Generation
- Accept PRD up to 50,000 characters or 5MB file.
- Stream progress to frontend (WebSocket or SSE).
- Tickets conform to the tasks schema.
- Validate LLM output with Zod; retry once on validation failure.
- Provider selection via config (not hardcoded).
- Log token usage and cost per generation.
- User can cancel generation.
- Purge PRD content after 90 days unless user opts in.

### Refinement
- Chat panel available next to draft preview.
- Tool calls execute transactionally with rollback on failure.
- Draft preview updates live as tools run.
- Conversation resumes across browser sessions.
- Log token usage and cost per chat turn.
- User can undo the most recent turn.

## Tooling for Refinement (Function Calls)
- update_ticket(id, fields)
- add_ticket(fields)
- delete_ticket(id)
- merge_tickets(ids[])
- split_ticket(id, count)
- reorder_tickets(ids[], order)
- bulk_update(ids[], fields)

## Key Constraints and Targets
- Generation latency: P50 under 60s, P95 under 3 min.
- Refinement turn latency: P50 under 8s, P95 under 20s.
- Typical sessions: 3-8 turns; cost under $0.10 with Haiku 4.5.
- Daily LLM spend cap per project: default $100.
- PRD size limit: 50,000 characters; reject above.

## LLM Provider Assumptions
- Primary model: Anthropic Claude Haiku 4.5.
- Upgrade path: Claude Sonnet 4.6 if quality or tool reliability is insufficient.
- Provider abstraction supports OpenAI, Gemini, and local Ollama fallback.
- Prompt caching enabled for system prompts, schema, and tools.

## Observability and Security
- Correlation ID per session and structured logs.
- Trace endpoint returns full event history, tool calls, and chat turns.
- JWT auth on all endpoints; Supabase RLS for data access.
- LLM API keys in Supabase Vault, never exposed to frontend.
- PRD retention policy enforced (purge after 90 days by default).

## Risks and Mitigations
- LLM outage or pricing change: provider abstraction + fallback.
- Generation quality below target: upgrade to Sonnet 4.6 after alpha validation.
- Tool calling reliability issues: validate during alpha with real PRDs.

## Out of Scope for v1
- Multi-agent coordination.
- Non-text PRD inputs.
- Automatic sprint planning or deadline assignment.
