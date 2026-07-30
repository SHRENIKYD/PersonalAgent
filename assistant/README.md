# Aide — Personal Assistant Agent

A personal assistant that *acts* rather than advises. Tell it "remind me to renew the lease
on Friday" and a task appears on your task list, dated. Ask "what's due today?" and it reads
the actual list rather than guessing from the conversation.

Built on the same two-project shape as the AEGIS reference:

- **`frontend/`** — Angular 17 (standalone components, signals). Assistant chat, Today
  dashboard, tasks, notes, a six-month growth tracker, interview prep (DSA/CS/System
  Design/Web), a certificates tracker, and settings.
- **`backend/`** — ASP.NET Core (.NET 8) minimal API. One endpoint, `POST /api/assistant`,
  which forwards one turn of the agent loop to the Anthropic API. It exists purely so your
  Anthropic API key never sits in browser-visible code. **Optional** — see Transport modes
  below.

## How the agent works

The interesting difference from AEGIS's Advisor tab: the Advisor is a chat proxy — one
request, one text reply. An assistant needs to take actions, so this is a real agent loop
with tools.

**The browser owns the loop and executes every tool itself**, in both transport modes below.
It forwards the message history plus tool definitions and hands the raw content blocks back.
So your tasks and notes never leave your machine — only the conversation does, exactly as
in AEGIS.

```
you ──▶ browser ──▶ backend ──▶ Anthropic       (mode: backend — the default)
             ▲                      │
             │   tool_use ──────────┘
             │        │
             │        ▼
             └── executed locally against localStorage,
                 tool_result fed back, loop continues

you ──▶ browser ─────────────────▶ Anthropic    (mode: direct — no backend to deploy)
             ▲                        │
             │   tool_use ────────────┘
             │        │
             │        ▼
             └── same local execution, key stored in this browser's localStorage
```

## Transport modes

Set on the **Settings** tab, stored in `localStorage`, switchable any time:

| Mode | Where the key lives | What it needs |
| --- | --- | --- |
| **`backend`** (default) | Server environment variable | The `.NET` API deployed somewhere — see `HOSTING_GUIDE.md` |
| **`direct`** | This browser's `localStorage` | Nothing but a key — no backend, no deploy step |

Direct mode calls `https://api.anthropic.com/v1/messages` straight from the browser with the
`anthropic-dangerous-direct-browser-access` header. It's the entire trade-off in one
sentence: **the key becomes readable by anything that runs in this browser** — a malicious
extension, anyone with access to the profile, or any script that ever gets injected into the
page. That's exactly what the backend exists to prevent. Reasonable on a machine only you
use; don't use it on a shared computer, and set a spend limit on the key in the Anthropic
console as a backstop. The Settings tab states this before you can enter a key.

`AgentService.requestTurn()` is the single place this branches — one method picks
`requestViaBackend()` or `requestDirect()` per turn based on `SettingsService.mode()`. Both
return the same `AssistantResponse` shape, so the agent loop itself has no idea which
transport served it.

The nine tools available to it:

| Tool | What it does |
| --- | --- |
| `add_task` | Adds a task, with a due date resolved to a concrete day |
| `list_tasks` | Reads the real list — open, done, all, or due today |
| `tasks_in_range` | Open dated tasks between two days — answers "what's on this week?" |
| `complete_task` | Marks one done by id, or by title fragment |
| `reschedule_task` | Moves a due date, or clears it |
| `delete_task` | Removes a task permanently — id only, never a title match |
| `write_note` | Saves something worth remembering |
| `edit_note` | Corrects or extends an existing note |
| `search_notes` | Recalls it later, across sessions |

Three details worth knowing if you extend this:

- **Adaptive thinking stays on.** With tools and thinking disabled, the model can write a
  tool call into its visible text instead of emitting a `tool_use` block — the call silently
  never runs. The browser echoes every content block back verbatim so thinking blocks
  round-trip correctly.
- **Ambiguity is refused, not guessed.** If a title fragment matches several tasks, the tool
  changes nothing and returns the candidates so the agent asks which one. Completing or
  rescheduling the wrong task is real rework. Both tools share one `resolveTask` helper, so
  the guarantee holds identically for each.
- **Destructive tools take an id only.** `delete_task` refuses title fragments outright,
  forcing a `list_tasks` read first. The asymmetry is deliberate: a wrongly completed task
  can be un-ticked, a wrongly deleted one cannot.

All state lives in your browser's `localStorage` under `assistant-tasks-v1` and
`assistant-notes-v1`. Clearing site data clears your tasks.

## Growth, prep, and certificates

Four more tabs, entirely UI-driven (the agent doesn't touch these — they're not exposed as
tools, since "did I move my body this week" isn't something an assistant should be answering
on your behalf):

- **Growth** — a six-month roadmap across Career, Health, Habits, and Balance, plus a
  26-week habit-streak grid. Month labels are computed from today's date
  (`generateMonthNames()` in `growth-data.ts`), so the tracker never goes stale.
- **DSA** — 11 topics, 165 problems (15 each), every one with a brute-force approach, an
  optimized approach with time/space complexity, and a plain-English explanation of why the
  optimization works. Content lives in `prep-dsa-data.ts`.
- **CS Fundamentals / System Design / Web** — concept questions (OS, DBMS, networking, OOP,
  system-design building blocks and case studies, JS/React/Node) with a plain-English
  explanation each — no brute-force/optimized split, since that doesn't apply to a
  definition. Content lives in `prep-concept-data.ts`.
- **Certificates** — a to-do list of certifications you're working toward, and a record of
  ones you've earned.

Progress checkboxes persist under `assistant-roadmap-v1`, `assistant-prep-v1`, and
`assistant-certs-v1`. The DSA and concept prep tabs share one UI shell each
(`PrepDsaComponent` for the brute-force/optimized format, `PrepConceptComponent` — generic,
parameterized by `category`/`topics` — for the other three) so a new prep category is a data
file plus one line in `app.component.ts`, not a new component.

## Quick local run

**Frontend only, direct mode** — fastest path to trying it:
```bash
cd frontend
npm install
npm start
# open http://localhost:4200, go to Settings, choose "Direct from browser", paste your key
```

**With the backend** (needs the .NET 8 SDK), mode `backend`:
```bash
cd backend
export ANTHROPIC_API_KEY=sk-ant-...      # Windows PowerShell: $env:ANTHROPIC_API_KEY="sk-ant-..."
dotnet run
# listens on http://localhost:5000
```
```bash
cd frontend
npm install
npm start
# open http://localhost:4200 — backend mode is the default
```

See **`HOSTING_GUIDE.md`** for free deployment — GitHub Pages alone in direct mode, or
Pages plus a free web service host for the backend.
