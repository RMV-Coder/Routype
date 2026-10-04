/* eslint-disable */
// Routype realtime server: chat rooms, presence and TypeArena multiplayer races.
//
// Clients authenticate with a short-lived HS256 token from GET /api/realtime/token,
// signed with REALTIME_JWT_SECRET (falls back to NEXTAUTH_SECRET).
//
// Run with: npm run ws

const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');

const PORT = process.env.PORT || process.env.WS_PORT || 4001;
const CORS_ORIGIN = process.env.WS_CORS_ORIGIN || '*';
const SECRET = process.env.REALTIME_JWT_SECRET || process.env.NEXTAUTH_SECRET;

const MAX_PLAYERS = 8;
const COUNTDOWN_MS = 3000;
const RACE_TIMEOUT_MS = 5 * 60 * 1000;   // a race ends after 5 minutes no matter what
const FINISHED_MATCH_TTL_MS = 10 * 60 * 1000;
const DISCONNECT_GRACE_MS = 10 * 1000;
const GHOST_COLORS = ['#e11d48', '#2563eb', '#16a34a', '#d97706', '#9333ea', '#0891b2', '#db2777', '#65a30d'];

function createDbPool() {
    if (!process.env.MYSQL_HOST) return null;
    return mysql.createPool({
        host: process.env.MYSQL_HOST,
        port: parseInt(process.env.MYSQL_PORT || '3306'),
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        waitForConnections: true,
        connectionLimit: 5,
        queueLimit: 0,
        charset: 'utf8mb4',
    });
}

const ack = (cb, payload) => { if (typeof cb === 'function') cb(payload); };

function main() {
    if (!SECRET) {
        console.error('REALTIME_JWT_SECRET or NEXTAUTH_SECRET must be set');
        process.exit(1);
    }
    const app = express();
    const pool = createDbPool();
    const httpServer = http.createServer(app);
    const io = new Server(httpServer, {
        cors: { origin: CORS_ORIGIN, methods: ['GET', 'POST'], credentials: true },
        path: '/realtime/socket.io',
        transports: ['websocket', 'polling'],
    });

    // Health check (also used by uptime pingers to keep free hosting awake)
    app.get('/api/ping', (_req, res) => res.status(200).send('ok'));

    io.use((socket, next) => {
        const token = socket.handshake.auth && socket.handshake.auth.token;
        if (!token) return next(new Error('Unauthorized'));
        try {
            const decoded = jwt.verify(token, SECRET);
            socket.data.user = { id: String(decoded.sub), name: decoded.name || null, type: decoded.type || null };
            return next();
        } catch (e) {
            return next(new Error('Unauthorized'));
        }
    });

    // -------------------------------------------------------------- chat
    async function isRoomMember(roomId, userId) {
        if (!pool) return false;
        const [rows] = await pool.execute(
            'SELECT 1 FROM message_room_member WHERE room_id = ? AND user_id = ? LIMIT 1',
            [roomId, userId]
        );
        return rows.length > 0;
    }

    // ------------------------------------------------------- TypeArena
    /**
     * In-memory match:
     * {
     *   id, hostId, createdAt, status: 'lobby' | 'countdown' | 'running' | 'finished',
     *   text, piece: { id, title, authorName } | null,
     *   participants: { [userId]: { id, name, color, ready, connected, progress, wpm, accuracy, finishedAt, placement } },
     *   caret: { [userId]: { index, ts } },
     *   startedAt, endsAt, winnerId
     * }
     */
    const matches = new Map();

    function publicMatch(m) {
        return {
            id: m.id,
            hostId: m.hostId,
            createdAt: m.createdAt,
            status: m.status,
            text: m.text,
            piece: m.piece,
            participants: m.participants,
            caret: m.caret,
            startedAt: m.startedAt || null,
            winnerId: m.winnerId || null,
        };
    }

    const broadcast = (m) => io.to(`ta:${m.id}`).emit('ta:state', publicMatch(m));

    function nextColor(m) {
        const used = new Set(Object.values(m.participants).map((p) => p.color));
        return GHOST_COLORS.find((c) => !used.has(c)) || GHOST_COLORS[Object.keys(m.participants).length % GHOST_COLORS.length];
    }

    function addParticipant(m, user) {
        if (!m.participants[user.id]) {
            m.participants[user.id] = {
                id: user.id, name: user.name || `Writer ${user.id}`, color: nextColor(m),
                ready: false, connected: true, progress: 0, wpm: 0, accuracy: 100, finishedAt: null, placement: null,
            };
        }
        m.participants[user.id].connected = true;
    }

    function sanitizeText(text) {
        if (typeof text !== 'string') return null;
        const clean = text.replace(/\s+/g, ' ').trim().slice(0, 2000);
        return clean.split(' ').length >= 3 ? clean : null;
    }

    function startCountdown(m) {
        m.status = 'countdown';
        io.to(`ta:${m.id}`).emit('ta:countdown', { at: Date.now(), seconds: COUNTDOWN_MS / 1000 });
        broadcast(m);
        setTimeout(() => {
            if (matches.get(m.id) !== m || m.status !== 'countdown') return;
            m.status = 'running';
            m.startedAt = Date.now();
            io.to(`ta:${m.id}`).emit('ta:start', { at: m.startedAt });
            broadcast(m);
            m.timeout = setTimeout(() => endMatch(m), RACE_TIMEOUT_MS);
        }, COUNTDOWN_MS);
    }

    function endMatch(m) {
        if (m.status === 'finished') return;
        m.status = 'finished';
        clearTimeout(m.timeout);
        // Unfinished players are ranked after finishers, by progress.
        const unfinished = Object.values(m.participants)
            .filter((p) => !p.finishedAt)
            .sort((a, b) => b.progress - a.progress);
        let place = Object.values(m.participants).filter((p) => p.finishedAt).length;
        for (const p of unfinished) p.placement = ++place;
        io.to(`ta:${m.id}`).emit('ta:ended', { winnerId: m.winnerId || null, at: Date.now() });
        broadcast(m);
        setTimeout(() => matches.delete(m.id), FINISHED_MATCH_TTL_MS);
    }

    function maybeEnd(m) {
        const active = Object.values(m.participants).filter((p) => p.connected);
        if (m.status === 'running' && active.every((p) => p.finishedAt)) endMatch(m);
    }

    function leaveMatch(socket, m, user) {
        socket.leave(`ta:${m.id}`);
        const p = m.participants[user.id];
        if (!p) return;
        if (m.status === 'lobby') delete m.participants[user.id];
        else p.connected = false;
        const remaining = Object.values(m.participants).filter((x) => x.connected);
        if (remaining.length === 0) {
            clearTimeout(m.timeout);
            matches.delete(m.id);
            return;
        }
        if (m.hostId === user.id) m.hostId = remaining[0].id;
        maybeEnd(m);
        broadcast(m);
    }

    io.on('connection', (socket) => {
        const user = socket.data.user;
        socket.join(`user:${user.id}`);
        socket.emit('presence:me', { id: user.id, name: user.name, type: user.type });
        socket.broadcast.emit('presence:join', { id: user.id, name: user.name });

        // ---- chat rooms: `room:<message_room.id>` requires membership
        socket.on('room:join', async (room) => {
            if (typeof room !== 'string' || room.length > 100) return;
            const match = /^room:(\d+)$/.exec(room);
            if (!match) return;
            try {
                if (!(await isRoomMember(Number(match[1]), user.id))) return;
                socket.join(room);
                socket.emit('room:joined', { room });
            } catch (err) {
                console.error('room:join failed', err);
            }
        });

        socket.on('room:leave', (room) => {
            if (typeof room === 'string') {
                socket.leave(room);
                socket.emit('room:left', { room });
            }
        });

        socket.on('chat:send', ({ room, message, tempId } = {}) => {
            if (typeof message !== 'string' || !message.trim() || message.length > 4000) return;
            if (typeof room !== 'string' || !socket.rooms.has(room)) return;
            io.to(room).emit('chat:new', {
                id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                tempId,
                user: { id: user.id, name: user.name },
                message,
                ts: Date.now(),
            });
        });

        socket.on('typing', ({ room, isTyping } = {}) => {
            if (typeof room !== 'string' || !socket.rooms.has(room)) return;
            socket.to(room).emit('typing', { userId: user.id, isTyping: !!isTyping });
        });

        // ---- TypeArena
        socket.on('ta:create', ({ text, piece } = {}, cb) => {
            const clean = sanitizeText(text);
            if (!clean) return ack(cb, { ok: false, error: 'invalid_text' });
            const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
            const m = {
                id, hostId: user.id, createdAt: Date.now(), status: 'lobby', text: clean,
                piece: piece && typeof piece === 'object'
                    ? { id: Number(piece.id) || null, title: String(piece.title || '').slice(0, 255) || null, authorName: String(piece.authorName || '').slice(0, 255) || null }
                    : null,
                participants: {}, caret: {},
            };
            addParticipant(m, user);
            matches.set(id, m);
            socket.join(`ta:${id}`);
            ack(cb, { ok: true, match: publicMatch(m) });
        });

        socket.on('ta:join', ({ matchId } = {}, cb) => {
            const m = matches.get(matchId);
            if (!m) return ack(cb, { ok: false, error: 'not_found' });
            const known = !!m.participants[user.id];
            if (!known && m.status !== 'lobby') return ack(cb, { ok: false, error: 'already_started' });
            if (!known && Object.keys(m.participants).length >= MAX_PLAYERS) return ack(cb, { ok: false, error: 'full' });
            addParticipant(m, user);
            socket.join(`ta:${m.id}`);
            broadcast(m);
            ack(cb, { ok: true, match: publicMatch(m) });
        });

        socket.on('ta:leave', ({ matchId } = {}, cb) => {
            const m = matches.get(matchId);
            if (!m) return ack(cb, { ok: false, error: 'not_found' });
            leaveMatch(socket, m, user);
            ack(cb, { ok: true });
        });

        socket.on('ta:ready', ({ matchId, ready } = {}, cb) => {
            const m = matches.get(matchId);
            if (!m || m.status !== 'lobby' || !m.participants[user.id]) return ack(cb, { ok: false });
            m.participants[user.id].ready = !!ready;
            const players = Object.values(m.participants);
            if (players.length >= 2 && players.every((p) => p.ready)) startCountdown(m);
            else broadcast(m);
            ack(cb, { ok: true });
        });

        // The host may start without waiting for everyone (e.g. to practise alone).
        socket.on('ta:start', ({ matchId } = {}, cb) => {
            const m = matches.get(matchId);
            if (!m || m.status !== 'lobby' || m.hostId !== user.id) return ack(cb, { ok: false });
            startCountdown(m);
            ack(cb, { ok: true });
        });

        socket.on('ta:caret', ({ matchId, index } = {}) => {
            const m = matches.get(matchId);
            if (!m || m.status !== 'running' || !m.participants[user.id]) return;
            const i = Math.max(0, Math.min(m.text.length, Number(index) || 0));
            m.caret[user.id] = { index: i, ts: Date.now() };
            socket.to(`ta:${m.id}`).emit('ta:caret', { userId: user.id, index: i });
        });

        socket.on('ta:progress', ({ matchId, progress, wpm, accuracy } = {}) => {
            const m = matches.get(matchId);
            if (!m || m.status !== 'running') return;
            const p = m.participants[user.id];
            if (!p || p.finishedAt) return;
            p.progress = Math.max(0, Math.min(100, Number(progress) || 0));
            if (typeof wpm === 'number' && isFinite(wpm)) p.wpm = Math.max(0, Math.min(350, wpm));
            if (typeof accuracy === 'number' && isFinite(accuracy)) p.accuracy = Math.max(0, Math.min(100, accuracy));
            broadcast(m);
        });

        socket.on('ta:finish', ({ matchId, wpm, accuracy } = {}, cb) => {
            const m = matches.get(matchId);
            if (!m || m.status !== 'running') return ack(cb, { ok: false });
            const p = m.participants[user.id];
            if (!p || p.finishedAt) return ack(cb, { ok: false });
            p.progress = 100;
            p.finishedAt = Date.now();
            if (typeof wpm === 'number' && isFinite(wpm)) p.wpm = Math.max(0, Math.min(350, wpm));
            if (typeof accuracy === 'number' && isFinite(accuracy)) p.accuracy = Math.max(0, Math.min(100, accuracy));
            p.placement = Object.values(m.participants).filter((x) => x.finishedAt).length;
            if (p.placement === 1) m.winnerId = user.id;
            maybeEnd(m);
            broadcast(m);
            ack(cb, { ok: true, placement: p.placement });
        });

        socket.on('disconnect', () => {
            socket.broadcast.emit('presence:leave', { id: user.id });
            // Give the player a moment to reconnect (page navigation, flaky network)
            // before removing them from their matches.
            setTimeout(() => {
                for (const m of matches.values()) {
                    if (!m.participants[user.id] || !m.participants[user.id].connected) continue;
                    const room = io.sockets.adapter.rooms.get(`ta:${m.id}`);
                    const stillHere = room && [...room].some((sid) => {
                        const s = io.sockets.sockets.get(sid);
                        return s && s.data.user && s.data.user.id === user.id;
                    });
                    if (!stillHere) leaveMatch(socket, m, user);
                }
            }, DISCONNECT_GRACE_MS);
        });
    });

    httpServer.listen(PORT, '0.0.0.0', () => {
        console.log(`Routype realtime server listening on port ${PORT} (path /realtime/socket.io)`);
    });
}

main();
