/* eslint-disable */
// Standalone Socket.io server with NextAuth session-cookie authentication
// Run with: npm run ws

const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');

const PORT = process.env.PORT || process.env.WS_PORT || 4001;
const CORS_ORIGIN = process.env.WS_CORS_ORIGIN || '*';



function parseCookies(cookieHeader) {
    const cookies = {};
    if (!cookieHeader) return cookies;
    const parts = cookieHeader.split(/;\s*/);
    for (const part of parts) {
        const idx = part.indexOf('=');
        if (idx > -1) {
            const k = decodeURIComponent(part.slice(0, idx).trim());
            const v = decodeURIComponent(part.slice(idx + 1).trim());
            cookies[k] = v;
        }
    }
    return cookies;
}

async function createDbPool() {
    return mysql.createPool({
        host: process.env.MYSQL_HOST,
        port: parseInt(process.env.MYSQL_PORT || '3306'),
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        waitForConnections: true,
        connectionLimit: 15,
        queueLimit: 0,
        charset: 'utf8mb4',
    });
}

async function getSessionAndUserByToken(pool, sessionToken) {
    if (!sessionToken) return null;
    const [rows] = await pool.execute(
        `SELECT 
            s.session_token as sessionToken,
            s.user_id,
            s.expires,
            u.id,
            u.name,
            u.email,
            u.image,
            u.type
        FROM session s
        JOIN user u ON s.user_id = u.id
        WHERE s.session_token = ? AND s.expires > NOW()`,
        [sessionToken]
    );
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
        session: { sessionToken: r.sessionToken, userId: String(r.user_id), expires: r.expires },
        user: { id: String(r.id), name: r.name, email: r.email, image: r.image, type: r.type },
    };
}

async function main() {
    const app = express();
    const pool = await createDbPool();

    const httpServer = http.createServer(app);
    const io = new Server(httpServer, {
        cors: { origin: CORS_ORIGIN, methods: ['GET', 'POST'], credentials: true },
        path: '/realtime/socket.io',
        allowEIO3: false,
        transports: ['websocket', 'polling'],
    });
    app.get('/api/ping', (req, res) => {
        console.log('Ping received! Keeping server alive...');
      return res.status(200).send('Ping received! Server is active.');
    });

    io.use(async (socket, next) => {
        try {
            const authToken = socket.handshake.auth && socket.handshake.auth.token;
            const sharedSecret = process.env.REALTIME_JWT_SECRET || process.env.NEXTAUTH_SECRET;
            if (authToken && sharedSecret) {
                try {
                    const decoded = jwt.verify(authToken, sharedSecret);
                    socket.data.user = { id: String(decoded.sub), name: decoded.name || null, type: decoded.type || null };
                    return next();
                } catch (e) {
                    return next(new Error('Unauthorized'));
                }
            }
            // Fallback to cookie-based session lookup if token not provided
            const cookies = parseCookies(socket.handshake.headers.cookie || '');
            const token = cookies['next-auth.session-token'] || cookies['__Secure-next-auth.session-token'];
            const result = await getSessionAndUserByToken(pool, token);
            if (!result) return next(new Error('Unauthorized'));
            socket.data.user = result.user;
            return next();
        } catch (err) {
            return next(err);
        }
    });

    io.on('connection', (socket) => {
        const user = socket.data.user;
        const userRoom = `user:${user.id}`;
        socket.join(userRoom);
        console.log(`User ${user.id} connected to room ${userRoom}`);

        socket.emit('presence:me', { id: user.id, name: user.name, type: user.type });
        socket.broadcast.emit('presence:join', { id: user.id, name: user.name });

        socket.on('room:join', (room) => {
            if (typeof room === 'string' && room.length <= 100) {
                socket.join(room);
                socket.emit('room:joined', { room });
            }
        });

        socket.on('room:leave', (room) => {
            if (typeof room === 'string') {
                socket.leave(room);
                socket.emit('room:left', { room });
            }
        });

        socket.on('chat:send', ({ room, message, tempId }) => {
            if (typeof message !== 'string' || message.length === 0) return;
            const payload = {
                id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                tempId,
                user: { id: user.id, name: user.name },
                message,
                ts: Date.now(),
            };
            if (room && typeof room === 'string') {
                io.to(room).emit('chat:new', payload);
            } else {
                io.emit('chat:new', payload);
            }
        });

        socket.on('typing', ({ room, isTyping }) => {
            const evt = { userId: user.id, isTyping: !!isTyping };
            if (room && typeof room === 'string') io.to(room).emit('typing', evt);
            else socket.broadcast.emit('typing', evt);
        });

        socket.on('disconnect', () => {
            socket.broadcast.emit('presence:leave', { id: user.id });
        });
    });

    // -------------------- TypeArena Multiplayer (in-memory) --------------------
    /**
     * Match schema (in-memory):
     * {
     *   id: string,
     *   createdAt: number,
     *   status: 'lobby' | 'countdown' | 'running' | 'finished',
     *   text: string,
     *   participants: {
     *     [userId]: { id, name, ready: boolean, progress: number, wpm: number, accuracy: number, finishedAt?: number }
     *   },
     *   caret: { [userId]: { index: number, ts: number } },
     *   winnerId?: string
     * }
     */
    const matches = new Map();

    function broadcastMatchState(io, matchId) {
        const match = matches.get(matchId);
        if (!match) return;
        io.to(`ta:${matchId}`).emit('ta:state', sanitizeMatch(match));
    }

    function sanitizeMatch(match) {
        // No secrets currently; return shallow clone to avoid external mutation
        return {
            id: match.id,
            createdAt: match.createdAt,
            status: match.status,
            text: match.text,
            participants: match.participants,
            caret: match.caret,
            winnerId: match.winnerId || null,
        };
    }

    function createMatch({ host, text }) {
        const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
        const match = {
            id,
            createdAt: Date.now(),
            status: 'lobby',
            text: text || defaultSampleText(),
            participants: {
                [host.id]: { id: host.id, name: host.name || `User ${host.id}` , ready: false, progress: 0, wpm: 0, accuracy: 100 },
            },
            caret: {},
        };
        matches.set(id, match);
        return match;
    }

    function defaultSampleText() {
        return 'The quick brown fox jumps over the lazy dog.';
    }

    io.on('connection', (socket) => {
        const user = socket.data.user;

        socket.on('ta:create', ({ text } = {}, ack) => {
            const match = createMatch({ host: user, text });
            socket.join(`ta:${match.id}`);
            if (typeof ack === 'function') ack({ ok: true, match: sanitizeMatch(match) });
            else socket.emit('ta:state', sanitizeMatch(match));
        });

        socket.on('ta:join', ({ matchId }, ack) => {
            const match = matches.get(matchId);
            if (!match) {
                if (typeof ack === 'function') ack({ ok: false, error: 'not_found' });
                return;
            }
            if (!match.participants[user.id]) {
                match.participants[user.id] = { id: user.id, name: user.name || `User ${user.id}`, ready: false, progress: 0, wpm: 0, accuracy: 100 };
            }
            socket.join(`ta:${match.id}`);
            broadcastMatchState(io, match.id);
            if (typeof ack === 'function') ack({ ok: true, match: sanitizeMatch(match) });
        });

        socket.on('ta:leave', ({ matchId }, ack) => {
            const match = matches.get(matchId);
            if (!match) return typeof ack === 'function' && ack({ ok: false, error: 'not_found' });
            socket.leave(`ta:${match.id}`);
            delete match.participants[user.id];
            broadcastMatchState(io, match.id);
            if (Object.keys(match.participants).length === 0) {
                matches.delete(match.id);
            }
            if (typeof ack === 'function') ack({ ok: true });
        });

        socket.on('ta:ready', ({ matchId, ready }, ack) => {
            const match = matches.get(matchId);
            if (!match || match.status !== 'lobby') return typeof ack === 'function' && ack({ ok: false });
            if (!match.participants[user.id]) return typeof ack === 'function' && ack({ ok: false });
            match.participants[user.id].ready = !!ready;
            broadcastMatchState(io, match.id);
            // Auto-start when everyone ready and at least 2 players
            const allReady = Object.values(match.participants).length >= 2 && Object.values(match.participants).every(p => p.ready);
            if (allReady) {
                match.status = 'countdown';
                io.to(`ta:${match.id}`).emit('ta:countdown', { at: Date.now(), seconds: 3 });
                setTimeout(() => {
                    // Guard if match was deleted
                    const m = matches.get(match.id);
                    if (!m) return;
                    m.status = 'running';
                    io.to(`ta:${m.id}`).emit('ta:start', { at: Date.now() });
                    broadcastMatchState(io, m.id);
                }, 3000);
            }
            if (typeof ack === 'function') ack({ ok: true });
        });

        socket.on('ta:caret', ({ matchId, index }) => {
            const match = matches.get(matchId);
            if (!match || match.status !== 'running') return;
            match.caret[user.id] = { index: Number(index) || 0, ts: Date.now() };
            socket.to(`ta:${match.id}`).emit('ta:caret', { userId: user.id, index: match.caret[user.id].index });
        });

        socket.on('ta:progress', ({ matchId, progress, wpm, accuracy }) => {
            const match = matches.get(matchId);
            if (!match || (match.status !== 'running' && match.status !== 'countdown')) return;
            const p = match.participants[user.id];
            if (!p) return;
            p.progress = Math.max(0, Math.min(100, Number(progress) || 0));
            if (typeof wpm === 'number') p.wpm = Math.max(0, wpm);
            if (typeof accuracy === 'number') p.accuracy = Math.max(0, Math.min(100, accuracy));
            broadcastMatchState(io, match.id);
            if (p.progress >= 100 && match.status === 'running') {
                p.finishedAt = Date.now();
                if (!match.winnerId) {
                    match.winnerId = user.id;
                }
                const everyoneDone = Object.values(match.participants).every(pp => (pp.progress || 0) >= 100);
                if (everyoneDone) {
                    match.status = 'finished';
                    io.to(`ta:${match.id}`).emit('ta:ended', { winnerId: match.winnerId, at: Date.now() });
                }
            }
        });

        socket.on('ta:finish', ({ matchId }, ack) => {
            const match = matches.get(matchId);
            if (!match) return typeof ack === 'function' && ack({ ok: false });
            const p = match.participants[user.id];
            if (p) p.progress = 100;
            broadcastMatchState(io, match.id);
            if (typeof ack === 'function') ack({ ok: true });
        });
    });

    httpServer.listen(PORT, '0.0.0.0', () => {
        console.log(`Socket.io server listening on port ${PORT} (path /realtime/socket.io)`);
    });
}

main().catch((err) => {
    console.error('Socket server error:', err);
    process.exit(1);
});


