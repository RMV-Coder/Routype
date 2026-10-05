# Routype

**A home for writers — and a typing game made of their words.**

Routype is a web app for people who write: stories, poetry, haiku, riddles, novel chapters, phrases, thoughts,
articles and blog posts. Pieces are written in rich **Markdown + LaTeX**, can be published to the community or kept
as a **private online diary**, and — if the author allows it — become texts that other people type in **TypeArena**,
a [monkeytype](https://monkeytype.com)-inspired speed-typing game with multiplayer races, ghost carets,
achievements, XP and leaderboards.

> Someone writes a love poem or a haiku, ticks *"Allow this piece in TypeArena"*, and from then on other writers
> can race each other typing it, credited to its author.

---

## Features

### Writing
- **Journals** — collections of pieces (a diary, a poetry book, a blog, a novel…), each `public`, `friends` or `private`.
- **Pieces** with a kind: story, poetry, riddle, novel chapter, phrase, thought, article, blog post or diary.
- **Rich editor** (CodeMirror) with toolbar and live preview:
  GitHub-flavoured markdown (tables, task lists, strikethrough), `<sub>`/`<sup>`, syntax-highlighted code,
  and **LaTeX math** — `$inline$` and `$$display$$` rendered with KaTeX.
- Line breaks are preserved for poems, haiku, riddles and diary entries.
- **Drafts, publishing and scheduling** (scheduled pieces go live automatically at their time).
- **Per-piece visibility** and an **opt-in flag to allow the piece in TypeArena**.
- **Echoes** — the home feed of public pieces, filterable by kind.
- User HTML is sanitised before rendering, so pieces cannot inject scripts.

### Privacy
- **Private profile** (Settings): nothing you write is visible to anyone else, your pieces are never offered in
  TypeArena and you are hidden from leaderboards — Routype becomes your private diary.
- The most restrictive of profile, journal and piece visibility always wins; drafts are only visible to their author.

### TypeArena (typing game)
| Mode | What it is |
| --- | --- |
| **Time** | 15 / 30 / 60 / 120 seconds — type as many words as you can |
| **Words** | 10 / 25 / 50 / 100 words as fast as you can |
| **Pieces** | type a poem, story or riddle shared by another writer (filter by kind), credited to its author |
| **Sudden death** | 25 / 50 / 100 words — one mistake ends the run |
| **Zen** | free typing with no target, no clock and no score (Shift+Enter to finish) |
| **Race** | multiplayer: create a room (community piece, random words or custom text), share the code, race on the same text and **see every opponent's ghost caret** live |

- Monkeytype-style engine: per-letter feedback, extra letters, stepping back into words with mistakes,
  Ctrl/Alt+Backspace to delete a word, Tab to restart, a scrolling three-line view.
- Results: WPM, raw WPM, accuracy, consistency, characters and a per-second WPM/error chart.
- Every “Type this piece” button on a published piece opens it directly in TypeArena.

### Gamification
- **XP and levels** for every finished test (bonus for race podiums).
- **23 achievements** across typing, racing and writing (e.g. *Quick Quill* — 60 WPM, *Survivor* — a flawless sudden
  death, *Champion* — win a race, *First Ink* — publish a piece, *Echo* — someone typed your piece).
- **Leaderboards** per mode (best result per writer) for today / this week / this month / all time.
- Profile with level, personal bests and recent results.

### Social
- Direct messages (realtime over Socket.IO, persisted in MySQL).
- Friend requests and “people you may know” suggestions.

---

## Tech stack

- [Next.js 15](https://nextjs.org) (App Router) · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui (Radix)
- [NextAuth](https://next-auth.js.org) — email & password, plus GitHub / Google when configured (JWT sessions)
- MySQL 8 via `mysql2`
- Socket.IO realtime server (`server/ws-server.cjs`) for races, ghost carets and chat
- react-markdown + remark-gfm + remark-math + rehype-katex + rehype-sanitize + rehype-highlight
- CodeMirror 6, Recharts, zod

## Project structure

```
.
├── database/
│   └── migrations/              # run in order: 001_…, 002_…
├── public/                      # static assets (logo)
├── server/
│   └── ws-server.cjs            # Socket.IO realtime server (races, ghost carets, chat)
└── src/
    ├── app/                     # Next.js routes
    │   ├── page.tsx             # Echoes — public feed
    │   ├── my-journals/         # journals and the piece composer
    │   ├── entries/[id]/        # read / edit a piece
    │   ├── typearena/           # solo modes + race lobby; [matchId]/ = multiplayer race
    │   ├── leaderboard/  achievements/  profile/  settings/  messages/
    │   ├── auth/                # sign in / sign up
    │   └── api/                 # route handlers (see below)
    ├── components/
    │   ├── ui/                  # shadcn/ui primitives
    │   ├── layout/              # sidebar, navigation, achievement toasts
    │   ├── writing/             # markdown editor & renderer, composer, badges
    │   ├── typing/              # typing engine, results, chart
    │   ├── social/              # chat, friend suggestions
    │   └── auth/
    ├── hooks/                   # use-socket, use-typearena, use-mobile
    ├── lib/
    │   ├── game/                # modes, word list, stats, achievements & XP, progress evaluation
    │   ├── auth/                # NextAuth configuration
    │   ├── api.ts               # auth + visibility helpers for route handlers
    │   ├── entries.ts           # piece validation & queries
    │   ├── pieces.ts            # markdown → typeable plain text
    │   ├── db.ts                # MySQL pool
    │   └── mysql-adapter.ts     # NextAuth adapter
    └── middleware.ts            # redirects signed-out visitors to /auth/signin
```

## Getting started

### Prerequisites
- Node.js 20+
- MySQL 8.0+

### 1. Install

```bash
npm install
```

### 2. Configure

```bash
cp .env.example .env.local
```

Fill in the MySQL credentials and a `NEXTAUTH_SECRET` (`openssl rand -base64 32`). GitHub / Google sign-in buttons
only appear when their client id and secret are set; email & password sign-up always works.

### 3. Create the database

```bash
mysql -u root -p < database/migrations/001_initial_schema.sql
mysql -u root -p < database/migrations/002_writing_and_typing_game.sql
```

The migrations create the `routype_db` schema. Existing databases that already have `001` applied only need `002`.

### 4. Run

```bash
# Terminal 1 — web app on http://localhost:3000
npm run dev

# Terminal 2 — realtime server on http://localhost:4001 (needed for races and live chat)
npm run ws
```

The realtime server reads the same `.env` variables (`NEXTAUTH_SECRET` or `REALTIME_JWT_SECRET`, `MYSQL_*`,
`WS_PORT`, `WS_CORS_ORIGIN`) — export them in that terminal, e.g. `set -a; source .env.local; set +a; npm run ws`.

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Next.js dev server (Turbopack) |
| `npm run build` / `npm start` | production build / server |
| `npm run ws` | realtime Socket.IO server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript |

## API overview

All routes require a signed-in session and return `401` otherwise.

| Route | Methods | Purpose |
| --- | --- | --- |
| `/api/auth/signup` | POST | create an email & password account |
| `/api/journals`, `/api/journals/:id` | GET POST · GET PATCH DELETE | your journals and their pieces |
| `/api/entries` | GET POST | public feed (`?kind=`, `?before=`) · create a piece |
| `/api/entries/:id` | GET PATCH DELETE | read (visibility-checked) · edit · delete a piece |
| `/api/typing/pieces` | GET | a random typeable piece (`?kind=`), or a specific one (`?id=`) |
| `/api/typing/scores` | GET POST | your results & personal bests · save a result (grants XP and achievements) |
| `/api/leaderboard` | GET | `?mode=time&value=30&period=weekly` |
| `/api/achievements` | GET | all achievements with your unlock status |
| `/api/profile` | GET PATCH | your profile, level and stats · update name, bio, privacy |
| `/api/realtime/token` | GET | short-lived token for the realtime server |
| `/api/messages`, `/api/messages/rooms`, `/api/messages/dm` | GET POST | direct messages |
| `/api/friends`, `/api/friends/suggestions` | POST · GET | friend requests and suggestions |

## Realtime protocol (Socket.IO, path `/realtime/socket.io`)

Clients authenticate with the token from `/api/realtime/token` (`auth: { token }`).

- **Races:** `ta:create {text, piece?}` → `ta:join {matchId}` → `ta:ready {matchId, ready}` (auto-starts when
  everyone is ready) or `ta:start` (host) → server emits `ta:countdown`, `ta:start` → clients send
  `ta:caret {index}` (ghost carets) and `ta:progress {progress, wpm, accuracy}` → `ta:finish` returns the
  placement → server emits `ta:ended`. `ta:state` broadcasts the whole match after every change.
- **Chat:** `room:join "room:<id>"` (membership is checked), `chat:send` → `chat:new`, `typing`.

Matches live in memory; results are persisted by each client through `/api/typing/scores`.

## Deployment notes

- The app moved from the `memoir/` folder to the repository root. If your hosting (e.g. Vercel, or Render for the
  realtime server) was configured with `memoir` as its root directory, change it to the repository root.
  The realtime server's start command is now `node server/ws-server.cjs` (or `npm run ws`).
- Set `NEXT_PUBLIC_WS_URL` on the web app to the public URL of the realtime server, and `WS_CORS_ORIGIN` on the
  realtime server to the web app's origin.
- Run `database/migrations/002_writing_and_typing_game.sql` against the production database.

## Roadmap

- Public writer profiles (`/u/:id`), following, likes and comments on pieces
- Accepting / declining friend requests (requests can be sent today) and friends-only feeds
- Writing & typing streaks (the `streak` table already exists)
- Personal-best ghost (race against your own best replay) and custom race settings (time limit, word count)
- Image uploads for pieces and journal covers
- End-to-end encrypted messages (the payload table is ready)
