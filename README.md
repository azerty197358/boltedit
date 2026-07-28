# BoltEdit — Browser-Based AI Code Generation Platform

An open-source, browser-based AI code generation and execution platform — similar to Bolt.new / bolt.diy. Prompt the AI, watch it write files in real time, install npm packages, and run a live dev server **entirely inside your browser tab**. The server (Vercel) is purely a static host + streaming API layer.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Vercel (Edge)                        │
│  ┌──────────────────┐    ┌───────────────────────────────┐  │
│  │  Next.js App     │    │  /api/chat (Edge Runtime)     │  │
│  │  Router (UI)     │───▶│  streams OpenRouter SSE →     │  │
│  │  Tailwind +      │    │  pipes content deltas to UI   │  │
│  │  Monaco Editor   │    └───────────────────────────────┘  │
│  └──────────────────┘    ┌───────────────────────────────┐  │
│         │                │  /api/models (Edge Runtime)   │  │
│         │                │  cached OpenRouter model list │  │
│         │                └───────────────────────────────┘  │
└─────────┼────────────────────────────────────────────────────┘
          │ fetch (text stream)
          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Browser Tab (Client)                      │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │ Chat Panel  │  │ Streaming    │  │  WebContainer      │  │
│  │ (prompt AI, │  │ Parser       │  │  (in-browser Node) │  │
│  │  see actions│─▶│ (XML tags →  │─▶│  mounts files,     │  │
│  │  stream in) │  │  file/shell) │  │  npm install,      │  │
│  └─────────────┘  └──────────────┘  │  vite dev server)  │  │
│                                       └─────────┬──────────┘  │
│  ┌──────────────────────────────────────────────▼──────────┐ │
│  │  Workbench: File Explorer · Monaco Editor · Live Preview│ │
│  └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                      Supabase (Postgres)                     │
│  projects · messages · files  (Row Level Security enabled)   │
└─────────────────────────────────────────────────────────────┘
```

## Stack

- **Frontend**: Next.js 13 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Code Editor**: Monaco Editor (the editor that powers VS Code)
- **In-Browser Runtime**: StackBlitz WebContainers — runs Node.js + Vite in the browser
- **AI Engine**: OpenRouter API (supports Claude 3.5 Sonnet, GPT-4o, and all free models)
- **Database / Auth**: Supabase (Postgres + Row Level Security + email/password auth)
- **Deployment**: Vercel (Edge Functions for streaming)

## Features

- **AI streaming generation**: The AI outputs files inside `<boltArtifact>` / `<boltAction>` XML tags. A streaming parser extracts actions chunk-by-chunk and updates the virtual file tree in real time.
- **Live in-browser execution**: WebContainers boot a Node.js runtime in the browser. Files are mounted, `npm install` runs, and a Vite dev server starts — all client-side.
- **Dynamic model selector**: Fetches the live model list from OpenRouter, highlights free models.
- **Dual-panel layout**: Chat + execution log on the left; tabbed file explorer, code editor, live preview, and terminal on the right.
- **Project persistence**: Projects, chat history, and file snapshots are saved to Supabase, scoped per-user via Row Level Security.
- **Auth**: Email/password sign-up and sign-in via Supabase Auth.

## Getting Started

### 1. Environment variables

Copy `.env.example` to `.env` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
OPENROUTER_API_KEY=sk-or-v1-...   # get one at https://openrouter.ai/keys
```

### 2. Database schema

The Supabase migration (tables + RLS policies) is applied automatically. Tables created:
- `projects` — user-owned workspaces
- `messages` — chat history per project
- `files` — virtual file tree per project

All tables have Row Level Security enabled with owner-scoped policies.

### 3. Install & run

```bash
npm install
npm run dev
```

Open http://localhost:3000, sign up, create a project, and start prompting.

### 4. Deploy to Vercel

1. Push to GitHub.
2. Import the repo on Vercel.
3. Add the environment variables (including `OPENROUTER_API_KEY`).
4. Deploy. The cross-origin isolation headers (required by WebContainers) are already configured in `next.config.js`.

## How the streaming parser works

The AI is instructed (via a strict system prompt) to output a single `<boltArtifact>` block containing `<boltAction>` children. Each action is either:
- `type="file" filePath="..."` — create/overwrite a file
- `type="shell" command="..."` — run a shell command (e.g. `npm install`)
- `type="start"` — start the dev server

The `StreamingParser` class (`lib/streaming-parser.ts`) feeds on raw text chunks from the Edge stream, holds back partial tag fragments so it never mis-splits a tag across chunk boundaries, and emits events: `artifact-start`, `action-start`, `action-delta`, `action-end`, `artifact-end`. The UI updates incrementally — you see each file appear as the AI writes it.

## License

MIT
