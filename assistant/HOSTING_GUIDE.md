# Hosting Guide

Two pieces to deploy: the Angular frontend (static, GitHub Pages) and the C# backend (needs
a server, any free web service host). Do the backend first — the frontend needs its URL.

## Part 1 — Backend

The backend holds your Anthropic API key. It must **never** be committed to the repo; set it
as an environment variable on the host.

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

## Part 2 — Frontend

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

4. The site lands at `https://YOUR-USERNAME.github.io/<repo-name>/`. The workflow passes
   `--base-href` automatically from the repo name.

### ⚠️ One Pages site per repository

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

## Cost

GitHub Pages is free. The backend's free tier is free. You pay only for Anthropic API usage,
per token — see the current rates at <https://platform.claude.com/docs/en/pricing>. Each
message costs more than a plain chat would, because a tool-using turn makes several model
calls: one to decide on the tool, one to respond to its result. The agent runs at `medium`
effort to keep that reasonable; raise it in `Program.cs` if you want more thorough reasoning.

## Security notes

- The key lives only in the host's environment. Rotate it in the Anthropic console if it
  ever leaks; nothing in this repo needs changing.
- `FRONTEND_ORIGINS` is what stops arbitrary sites from spending your API budget through
  your backend. Keep it narrow — never `*`.
- Your tasks and notes stay in your browser. The backend is stateless and stores nothing.
