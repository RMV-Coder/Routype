This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Real-time Services

This app includes both SSE and a standalone Socket.io server.

- SSE endpoint: `GET /api/sse` (requires authenticated session)
  - Sends `ready` and periodic `heartbeat` events
  - Client hook: `src/hooks/use-sse.ts`

- Socket.io server: standalone Node process with NextAuth cookie auth
  - Script: `npm run ws` (env `WS_PORT` default 4001)
  - Path: `/realtime/socket.io`
  - CORS: `WS_CORS_ORIGIN` (default `*`)
  - Emits presence events and supports rooms, `chat:send` -> `chat:new`

Run both in dev:

```bash
# Terminal 1
npm run dev

# Terminal 2
WS_PORT=4001 WS_CORS_ORIGIN=http://localhost:3000 npm run ws
```

Required env vars (also for NextAuth):

```
MYSQL_HOST=...
MYSQL_PORT=3306
MYSQL_USER=...
MYSQL_PASSWORD=...
MYSQL_DATABASE=...
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=...
```

Client hooks:

- `src/hooks/use-sse.ts`: EventSource with exponential backoff, heartbeat tracking
- `src/hooks/use-socket.ts`: Socket.io with reconnection and presence

UI example:

- `src/components/custom/chat.tsx`: Chat UI with optimistic updates using Socket.io; listens to SSE notifications

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
