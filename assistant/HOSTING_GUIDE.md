# Hosting Guide

Two ways to put this on the web, both free. Pick one:

| | GitHub Pages only | Pages + backend |
| --- | --- | --- |
| **Transport mode** | `direct` | `backend` |
| **What you deploy** | The Angular frontend, nothing else | The frontend, plus the .NET API on a separate host |
| **Where your key lives** | This browser's `localStorage` | The backend's environment variables |
| **Exposure** | Readable by anything running in this browser | Never touches the browser |
| **Setup time** | Minutes | A bit longer — a second service to configure |

If you're not sure, start with **Option A**. It's live in minutes and you can switch to
Option B later without losing anything — mode is a runtime setting, not a rebuild.

## Option A — GitHub Pages only (direct mode)

The frontend calls Anthropic straight from the browser. No backend, no second host, nothing
else to deploy.

1. **Merge this branch to `main`** — the deploy workflow only triggers there.
2. Repo **Settings → Pages → Source: GitHub Actions**.
3. Push lands the site at `https://YOUR-USERNAME.github.io/<repo-name>/`. The workflow at
   `.github/workflows/deploy-assistant-pages.yml` passes `--base-href` automatically from
   the repo name.
4. Open the site, go to **Settings**, choose **Direct from browser**, paste your Anthropic
   API key.

That's the whole deployment. Nothing in `environment.prod.ts` needs to be correct for this
path — direct mode never calls the backend URL there.

### ⚠️ Read this before choosing Option A

Your key sits in this browser's `localStorage`. Anything that runs in this browser can read
it — a malicious extension, anyone else with access to this machine, or any script that ever
gets injected into the page (XSS). This is not a bug in how it's stored; it's the inherent
trade-off of calling an API from client-side code with a secret key. The Settings tab states
this before you can enter a key, and it's worth repeating here because it's the whole reason
Option B exists.

Reasonable when:
- It's your own machine, not shared with people you don't trust with your Anthropic budget.
- You've set a **spend limit** on the key in the Anthropic console, so a leak has a ceiling.

Not reasonable when:
- The page might be opened on a public or shared computer.
- You want to share the deployed link with someone else — each visitor would need their own
  key anyway, since the key lives per-browser, not per-deployment.

If a key leaks, revoke it in the Anthropic console. Nothing in this repo needs to change —
just paste the replacement into Settings.

## Option B — Pages + a free backend host (backend mode)

Do the backend first; the frontend needs its URL.

### Part 1 — Backend

The backend holds your Anthropic API key server-side. It must **never** be committed to the
repo; set it as an environment variable on the host.

Any host that builds a Dockerfile works. Using Render as the example:

1. Create a new **Web Service** and point it at this repository.
2. Set the **root directory** to `assistant/backend`.
3. Choose **Docker** as the runtime — the included `Dockerfile` handles the build.
4. Add environment variables:

   | Key | Value |
   | --- | --- |
   | `ANTHROPIC_API_KEY` | Your key, `sk-ant-...` |
   | `FRONTEND_ORIGINS` | `https://YOUR-USERNAME.github.io` |

   `FRONTEND_ORIGINS` is the CORS allowlist — comma-separate multiple origins. Get this
   wrong and the browser blocks every request, which shows up as a failed request in the
   chat rather than an obvious CORS message.

   You do not need to set `PORT`; the host injects it and `Program.cs` reads it at startup.

5. Deploy, then visit the service URL. You should see
   `{"status":"Personal assistant agent API is running"}`. Copy that URL.

**Free tiers sleep when idle.** The first message after a quiet spell may take 30–60 seconds
while the service wakes. That is the host, not the agent.

### Part 2 — Frontend

1. Put your backend URL into `assistant/frontend/src/environments/environment.prod.ts`:

   ```ts
   export const environment = {
     production: true,
     apiBaseUrl: 'https://your-backend.onrender.com',   // no trailing slash
   };
   ```

2. Commit and push. The workflow at `.github/workflows/deploy-assistant-pages.yml` builds
   and publishes on every push to `main` that touches `assistant/frontend/**`.

3. In the repository settings, under **Pages**, set the source to **GitHub Actions**.

4. The site lands at `https://YOUR-USERNAME.github.io/<repo-name>/`.

5. On the deployed site, **Settings** tab already defaults to backend mode — nothing further
   to do there. (If you'd previously tried direct mode in the same browser, switch back to
   **Via backend**.)

## ⚠️ One Pages site per repository (applies to both options)

GitHub Pages publishes a single site per repo. This repo already has static files at its
root, and **the assistant workflow will replace whatever is currently published** the first
time it runs. Options, in rough order of least surprise:

- **Put the assistant in its own repository.** Cleanest if you want to keep the existing
  page at your `github.io` root.
- **Keep both, assistant at a subpath.** Add the root files as an extra artifact step in the
  workflow, publishing the assistant under `/assistant/`. Needs a matching `--base-href`.
- **Let the assistant take over.** Delete the workflow's concern entirely and accept that the
  root page goes away.

Decide before the first push to `main`. Nothing is lost either way — the files stay in git —
but the published URL changes.

## Cost (both options)

GitHub Pages is free. Option B's backend free tier is free. You pay only for Anthropic API
usage, per token — see the current rates at <https://platform.claude.com/docs/en/pricing>.
Each message costs more than a plain chat would, because a tool-using turn makes several
model calls: one to decide on the tool, one to respond to its result. The agent runs at
`medium` effort to keep that reasonable — raise it in `Program.cs` (backend mode) or
`DIRECT_CONFIG` in `agent.service.ts` (direct mode) if you want more thorough reasoning.

## Security notes

- **Backend mode:** the key lives only in the host's environment. Rotate it in the Anthropic
  console if it ever leaks; nothing in this repo needs changing. `FRONTEND_ORIGINS` is what
  stops arbitrary sites from spending your API budget through your backend — keep it narrow,
  never `*`.
- **Direct mode:** the key lives in this browser's `localStorage` and is exposed to anything
  that runs on the page — see the warning under Option A. Set a spend limit on the key as a
  backstop, and don't use this mode on a shared computer.
- **Both modes:** your tasks and notes stay in your browser regardless of transport. Only
  chat messages ever leave the machine.
