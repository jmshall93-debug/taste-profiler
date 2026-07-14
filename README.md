# Taste Profiler

A soul companion for mapping the territory of your taste. Visitors open the app and start chatting immediately — no account, no API key, no setup screen.

## Local development

Requires Node.js 18+ (now installed on this machine). Dependencies are already in `node_modules/` after setup; re-run `npm install` only after cloning fresh or changing `package.json`.

1. Clone the repository
2. Create a `.env` file in the project root:

```env
OPENAI_API_KEY=sk-...
```

3. Install dependencies (skip if `node_modules/` already exists):

```bash
npm install
```

4. Run the application:

```bash
npm start
```

5. Open [http://localhost:3000](http://localhost:3000)

The API key lives only in `.env` on the server. It is never sent to the browser, logged, or committed to git.

## How it works

- **Node** runs the JavaScript server process.
- **Express** serves `index.html` and exposes a protected `/api/chat` endpoint.
- The browser sends conversation messages to `/api/chat`; the server adds the system prompt and calls OpenAI with `OPENAI_API_KEY`.
- Responses stream back to the browser. Conversation history is stored in the browser's `localStorage` only.

## Deploy to Render

You do **not** need to run `npm install` locally for Render — Render runs it during deploy. You do need the project in a Git repository.

### 1. Push to GitHub

From the project folder:

```bash
git init
git add .
git commit -m "Taste Profiler with secure OpenAI backend"
```

Create a new repository on GitHub, then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/taste-profiler.git
git branch -M main
git push -u origin main
```

### 2. Create the Render service

1. Sign in at [render.com](https://render.com) and click **New +** → **Blueprint** (or **Web Service**).
2. Connect your GitHub account and select the `taste-profiler` repository.
3. If using the included `render.yaml` blueprint, Render reads the build/start commands automatically.
4. Under **Environment**, add:
   - **Key:** `OPENAI_API_KEY`
   - **Value:** your OpenAI key (mark as secret)
5. Choose the **Free** plan and click **Deploy**.

Render assigns a public URL like `https://taste-profiler.onrender.com`. First visit after idle may take ~1 minute while the free tier wakes up.

### Render settings (if not using blueprint)

| Setting | Value |
|---------|-------|
| Runtime | Node |
| Build command | `npm install` |
| Start command | `npm start` |
| Environment | `OPENAI_API_KEY` (secret) |

## Spending and abuse controls

Use a **dedicated OpenAI project/key** for this app with a low monthly auto-recharge ceiling and spend alerts. Application rate limiting reduces casual abuse but does not guarantee a maximum bill — OpenAI's billing limits are the real safety net.

The server applies:
- IP-based rate limiting (30 requests per 15 minutes)
- Message count and length limits
- Fixed output token ceiling

## Files

| File | Purpose |
|------|---------|
| `index.html` | Chat interface |
| `server.js` | Express server and OpenAI proxy |
| `recommendations.html` | Static reading room |
| `taste-profile.md` | Profile and soul reading |
| `recommendations.md` | Curated recommendations |

## Reading room

Static recommendations are available at `/recommendations` when the server is running.
