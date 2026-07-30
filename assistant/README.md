# Aide — Personal Assistant Agent

A personal assistant that *acts* rather than advises. Tell it "remind me to renew the lease
on Friday" and a task appears on your task list, dated. Ask "what's due today?" and it reads
the actual list rather than guessing from the conversation.

Built on the same two-project shape as the AEGIS reference:

- **`frontend/`** — Angular 17 (standalone components, signals). Assistant chat, Today
  dashboard, tasks, and notes.
- **`backend/`** — ASP.NET Core (.NET 8) minimal API. One endpoint, `POST /api/assistant`,
  which forwards one turn of the agent loop to the Anthropic API. It exists purely so your
  Anthropic API key never sits in browser-visible code.

## How the agent works

The interesting difference from AEGIS's Advisor tab: the Advisor is a chat proxy — one
request, one text reply. An assistant needs to take actions, so this is a real agent loop
with tools.

**The browser owns the loop and executes every tool itself.** The backend is stateless: it
forwards the message history plus tool definitions and hands the raw content blocks back.
So your tasks and notes never leave your machine — only the conversation does, exactly as
in AEGIS.

```
you ──▶ browser ──▶ backend ──▶ Anthropic
             ▲                      │
             │   tool_use ──────────┘
             │        │
             │        ▼
             └── executed locally against localStorage,
                 tool_result fed back, loop continues
```

The five tools available to it:

| Tool | What it does |
| --- | --- |
| `add_task` | Adds a task, with a due date resolved to a concrete day |
| `list_tasks` | Reads the real list — open, done, all, or due today |
| `complete_task` | Marks one done by id, or by title fragment |
| `write_note` | Saves something worth remembering |
| `search_notes` | Recalls it later, across sessions |

Two details worth knowing if you extend this:

- **Adaptive thinking stays on.** With tools and thinking disabled, the model can write a
  tool call into its visible text instead of emitting a `tool_use` block — the call silently
  never runs. The browser echoes every content block back verbatim so thinking blocks
  round-trip correctly.
- **Ambiguity is refused, not guessed.** If `complete_task` gets a title fragment matching
  several tasks, it changes nothing and returns the candidates so the agent asks which one.
  Completing the wrong task is real rework.

All state lives in your browser's `localStorage` under `assistant-tasks-v1` and
`assistant-notes-v1`. Clearing site data clears your tasks.

## Quick local run

**Backend** (needs the .NET 8 SDK)
```bash
cd backend
export ANTHROPIC_API_KEY=sk-ant-...      # Windows PowerShell: $env:ANTHROPIC_API_KEY="sk-ant-..."
dotnet run
# listens on http://localhost:5000
```

**Frontend**
```bash
cd frontend
npm install
npm start
# open http://localhost:4200
```

With both running, the assistant works end to end.

See **`HOSTING_GUIDE.md`** for free deployment (GitHub Pages for the frontend, a free web
service host for the backend).
