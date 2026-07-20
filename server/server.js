/* ==================== KOITUS REAL-TIME SERVER ====================
 * Production-grade chat server with Redis persistence
 * Deployed on Render for WebSocket support
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// ==================== REDIS / STATE LAYER ====================
let kv;
let redisAvailable = false;

(async () => {
    try {
        const { Redis } = require('@upstash/redis');
        const redisUrl = process.env.REDIS_URL || process.env.KV_URL || '';
        const redisToken = process.env.REDIS_TOKEN || process.env.KV_REST_API_TOKEN || '';

        if (redisUrl && redisToken) {
            kv = new Redis({ url: redisUrl, token: redisToken });
            await kv.ping();
            redisAvailable = true;
            console.log('✅ Connected to Upstash Redis');
        } else {
            console.log('ℹ️ No Redis credentials found, using in-memory storage (data not persisted)');
        console.log('⚠️ WARNING: Data will be lost on server restart. Set REDIS_URL and REDIS_TOKEN for persistence.');
        }
    } catch (err) {
        console.log('ℹ️ Redis unavailable, using in-memory storage:', err.message);
    }
})();

// In-memory fallback stores (data will be lost on restart)
const memUsers = new Map();
const memConversations = new Map();
const memCalls = new Map();
const memSocketMap = new Map(); // socketId -> userId

// ==================== HELPERS ====================

function getRedis() {
    return kv;
}

function isRedisAvailable() {
    return redisAvailable && kv;
}

// User helpers
async function getUser(userId) {
    if (isRedisAvailable()) {
        try {
            const data = await kv.get(`user:${userId}`);
            return data || null;
        } catch { return memUsers.get(userId) || null; }
    }
    return memUsers.get(userId) || null;
}

async function setUser(userId, data) {
    if (isRedisAvailable()) {
        try {
            await kv.set(`user:${userId}`, data);
            await kv.sadd('users:all', userId);
        } catch { memUsers.set(userId, data); }
    }
    memUsers.set(userId, data);
}

async function removeUser(userId) {
    if (isRedisAvailable()) {
        try {
            await kv.del(`user:${userId}`);
            await kv.srem('users:all', userId);
            await kv.srem('users:online', userId);
        } catch { memUsers.delete(userId); }
    }
    memUsers.delete(userId);
}

async function getOnlineUsers() {
    if (isRedisAvailable()) {
        try {
            const ids = await kv.smembers('users:online');
            const users = [];
            for (const id of ids) {
                const u = await getUser(id);
                if (u) users.push(u);
            }
            return users;
        } catch { return Array.from(memUsers.values()).filter(u => u.online); }
    }
    return Array.from(memUsers.values()).filter(u => u.online);
}

async function setUserOnline(userId, socketId) {
    if (isRedisAvailable()) {
        try {
            await kv.sadd('users:online', userId);
            await kv.set(`user:${userId}:socket`, socketId);
        } catch { /* fallback handled by in-memory */ }
    }
}

async function setUserOffline(userId) {
    if (isRedisAvailable()) {
        try {
            await kv.srem('users:online', userId);
            await kv.del(`user:${userId}:socket`);
        } catch { /* fallback */ }
    }
}

async function getSocketId(userId) {
    if (isRedisAvailable()) {
        try {
            return await kv.get(`user:${userId}:socket`);
        } catch { return null; }
    }
    const u = memUsers.get(userId);
    return u ? u.socketId : null;
}

// Conversation helpers
async function getConversation(convId) {
    if (isRedisAvailable()) {
        try {
            const data = await kv.get(`conv:${convId}`);
            return data || null;
        } catch { return memConversations.get(convId) || null; }
    }
    return memConversations.get(convId) || null;
}

async function setConversation(convId, data) {
    if (isRedisAvailable()) {
        try {
            await kv.set(`conv:${convId}`, data);
        } catch { memConversations.set(convId, data); }
    }
    memConversations.set(convId, data);
}

// Call helpers
async function setCall(callId, data) {
    if (isRedisAvailable()) {
        try {
            await kv.set(`call:${callId}`, data);
            await kv.sadd('calls:active', callId);
        } catch { memCalls.set(callId, data); }
    }
    memCalls.set(callId, data);
}

async function getCall(callId) {
    if (isRedisAvailable()) {
        try {
            return await kv.get(`call:${callId}`);
        } catch { return memCalls.get(callId) || null; }
    }
    return memCalls.get(callId) || null;
}

async function removeCall(callId) {
    if (isRedisAvailable()) {
        try {
            await kv.del(`call:${callId}`);
            await kv.srem('calls:active', callId);
        } catch { memCalls.delete(callId); }
    }
    memCalls.delete(callId);
}

// ==================== EXPRESS SETUP ====================

const app = express();
const ioServer = http.createServer(app);

const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : ['http://localhost:3001', 'http://localhost:3000', 'https://koitus.vercel.app'];

const io = new Server(ioServer, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
});

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// ==================== REST API ENDPOINTS ====================

// Health check
app.get('/api/health', async (req, res) => {
    let redisStatus = 'disconnected';
    if (isRedisAvailable()) {
        try {
            await kv.ping();
            redisStatus = 'connected';
        } catch { redisStatus = 'error'; }
    }
    res.json({
        status: 'ok',
        version: '1.0.0',
        redis: redisStatus,
        users: isRedisAvailable() ? await getOnlineUsers().then(u => u.length).catch(() => memUsers.size) : memUsers.size,
        conversations: isRedisAvailable() ? 0 : memConversations.size,
        activeCalls: isRedisAvailable() ? 0 : memCalls.size,
        uptime: process.uptime(),
        timestamp: Date.now()
    });
});

// Get all online users
app.get('/api/users', async (req, res) => {
    try {
        const users = await getOnlineUsers();
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Get user by ID
app.get('/api/users/:id', async (req, res) => {
    try {
        const user = await getUser(req.params.id);
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// Get conversation
app.get('/api/conversations/:userId1/:userId2', async (req, res) => {
    try {
        const { userId1, userId2 } = req.params;
        const convId = [userId1, userId2].sort().join('_');
        const conversation = await getConversation(convId);

        if (conversation) {
            res.json(conversation);
        } else {
            res.json({ id: convId, participants: [userId1, userId2], messages: [] });
        }
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch conversation' });
    }
});

// Get active calls
app.get('/api/calls', async (req, res) => {
    try {
        if (isRedisAvailable()) {
            const ids = await kv.smembers('calls:active');
            const calls = [];
            for (const id of ids) {
                const c = await getCall(id);
                if (c) calls.push(c);
            }
            res.json(calls);
        } else {
            res.json(Array.from(memCalls.values()));
        }
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch calls' });
    }
});

// ==================== SOCKET.IO REAL-TIME ====================

io.on('connection', (socket) => {
    console.log(`🟢 User connected: ${socket.id}`);

    // ---------- JOIN PLATFORM ----------
    socket.on('user_join', async (userData) => {
        try {
            const userId = userData.id || uuidv4();

            const userDataObj = {
                id: userId,
                socketId: socket.id,
                name: userData.name || 'User',
                avatar: userData.avatar || '',
                type: userData.type || 'general',
                online: true,
                status: 'online',
                joinedAt: Date.now(),
                coords: userData.coords || null
            };

            await setUser(userId, userDataObj);
            await setUserOnline(userId, socket.id);
            memSocketMap.set(socket.id, userId);

            socket.userId = userId;
            socket.join(`user:${userId}`);

            // Broadcast online status
            io.emit('user_online', { userId, socketId: socket.id });

            // Send back online users
            const onlineUsers = await getOnlineUsers();
            io.emit('users_list', onlineUsers);

            console.log(`✅ User ${userData.name} joined with ID: ${userId}`);
        } catch (err) {
            console.error('Error in user_join:', err);
            socket.emit('error', { message: 'Failed to join platform' });
        }
    });

    // ---------- SEND MESSAGE ----------
    socket.on('send_message', async (data) => {
        try {
            const { from, to, text, type = 'text' } = data;

            if (!from || !to) {
                socket.emit('error', { message: 'Missing sender or recipient' });
                return;
            }

            const message = {
                id: uuidv4(),
                from,
                to,
                text,
                type,
                timestamp: Date.now(),
                delivered: false,
                read: false
            };

            const convId = [from, to].sort().join('_');
            let conversation = await getConversation(convId);

            if (!conversation) {
                conversation = { id: convId, participants: [from, to], messages: [] };
            }

            conversation.messages.push(message);

            // Keep last 500 messages per conversation
            if (conversation.messages.length > 500) {
                conversation.messages = conversation.messages.slice(-500);
            }

            await setConversation(convId, conversation);

            // Deliver to recipient in real-time
            const recipientSocketId = await getSocketId(to);
            if (recipientSocketId) {
                io.to(recipientSocketId).emit('receive_message', message);

                io.to(recipientSocketId).emit('notification', {
                    type: 'message',
                    from,
                    text: text.substring(0, 100),
                    timestamp: Date.now()
                });
            }

            // Confirm delivery to sender
            socket.emit('message_delivered', { messageId: message.id, delivered: true });

            console.log(`📨 Message from ${from} to ${to}: ${text.substring(0, 50)}...`);
        } catch (err) {
            console.error('Error in send_message:', err);
            socket.emit('error', { message: 'Failed to send message' });
        }
    });

    // ---------- MARK READ ----------
    socket.on('mark_read', async (data) => {
        try {
            const { messageId, conversationId } = data;
            const conversation = await getConversation(conversationId);

            if (conversation) {
                const msg = conversation.messages.find(m => m.id === messageId);
                if (msg) {
                    msg.read = true;
                    await setConversation(conversationId, conversation);

                    // Notify sender
                    const otherUserId = conversation.participants.find(p => p !== socket.userId);
                    if (otherUserId) {
                        const otherSocketId = await getSocketId(otherUserId);
                        if (otherSocketId) {
                            io.to(otherSocketId).emit('message_read', { messageId });
                        }
                    }
                }
            }
        } catch (err) {
            console.error('Error in mark_read:', err);
        }
    });

    // ---------- TYPING INDICATOR ----------
    socket.on('typing_start', async (data) => {
        try {
            const { from, to } = data;
            const socketId = await getSocketId(to);
            if (socketId) {
                io.to(socketId).emit('user_typing', { from, typing: true });
            }
        } catch (err) { /* silently fail */ }
    });

    socket.on('typing_stop', async (data) => {
        try {
            const { from, to } = data;
            const socketId = await getSocketId(to);
            if (socketId) {
                io.to(socketId).emit('user_typing', { from, typing: false });
            }
        } catch (err) { /* silently fail */ }
    });

    // ---------- VIDEO/VOICE CALLS (WebRTC Signaling) ----------
    socket.on('initiate_call', async (data) => {
        try {
            const { from, to, type = 'video' } = data;
            const callId = uuidv4();

            const callerData = await getUser(from);

            const call = {
                id: callId,
                caller: from,
                receiver: to,
                callerName: callerData?.name || 'Unknown',
                type,
                status: 'initiated',
                startedAt: Date.now()
            };

            await setCall(callId, call);

            const recipientSocketId = await getSocketId(to);
            if (recipientSocketId) {
                io.to(recipientSocketId).emit('incoming_call', {
                    callId,
                    from,
                    type,
                    callerName: callerData?.name || 'Unknown'
                });
            }

            console.log(`📞 ${type} call initiated: ${from} → ${to} (${callId})`);
        } catch (err) {
            console.error('Error in initiate_call:', err);
        }
    });

    socket.on('accept_call', async (data) => {
        try {
            const { callId, from } = data;
            const call = await getCall(callId);

            if (call) {
                call.status = 'accepted';
                await setCall(callId, call);

                const callerSocketId = await getSocketId(call.caller);
                if (callerSocketId) {
                    io.to(callerSocketId).emit('call_accepted', { callId, receiver: from });
                }
            }
        } catch (err) {
            console.error('Error in accept_call:', err);
        }
    });

    socket.on('reject_call', async (data) => {
        try {
            const { callId } = data;
            const call = await getCall(callId);

            if (call) {
                await removeCall(callId);

                const callerSocketId = await getSocketId(call.caller);
                if (callerSocketId) {
                    io.to(callerSocketId).emit('call_rejected', { callId });
                }
            }
        } catch (err) {
            console.error('Error in reject_call:', err);
        }
    });

    socket.on('end_call', async (data) => {
        try {
            const { callId } = data;
            const call = await getCall(callId);

            if (call) {
                call.status = 'ended';
                call.endedAt = Date.now();

                const callerSocketId = await getSocketId(call.caller);
                const receiverSocketId = await getSocketId(call.receiver);

                if (callerSocketId) {
                    io.to(callerSocketId).emit('call_ended', { callId });
                }
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit('call_ended', { callId });
                }

                await removeCall(callId);
            }
        } catch (err) {
            console.error('Error in end_call:', err);
        }
    });

    // ---------- WEBRTC SIGNALING ----------
    socket.on('webrtc_offer', async (data) => {
        try {
            const { to, offer } = data;
            const socketId = await getSocketId(to);
            if (socketId) {
                io.to(socketId).emit('webrtc_offer', { from: socket.userId, offer });
            }
        } catch (err) { /* silently fail */ }
    });

    socket.on('webrtc_answer', async (data) => {
        try {
            const { to, answer } = data;
            const socketId = await getSocketId(to);
            if (socketId) {
                io.to(socketId).emit('webrtc_answer', { from: socket.userId, answer });
            }
        } catch (err) { /* silently fail */ }
    });

    socket.on('webrtc_ice_candidate', async (data) => {
        try {
            const { to, candidate } = data;
            const socketId = await getSocketId(to);
            if (socketId) {
                io.to(socketId).emit('webrtc_ice_candidate', { from: socket.userId, candidate });
            }
        } catch (err) { /* silently fail */ }
    });

    // ---------- USER STATUS ----------
    socket.on('status_update', async (data) => {
        try {
            const userId = socket.userId;
            const user = await getUser(userId);
            if (user) {
                user.status = data.status;
                await setUser(userId, user);
                io.emit('user_status_changed', { userId, status: data.status });
            }
        } catch (err) { /* silently fail */ }
    });

    // ---------- DISCONNECT ----------
    socket.on('disconnect', async () => {
        try {
            const userId = socket.userId || memSocketMap.get(socket.id);
            memSocketMap.delete(socket.id);

            if (userId) {
                const user = await getUser(userId);
                if (user) {
                    user.online = false;
                    user.status = 'offline';
                    user.lastSeen = Date.now();
                    await setUser(userId, user);
                    await setUserOffline(userId);

                    io.emit('user_offline', { userId, lastSeen: Date.now() });
                    console.log(`🔴 User ${user.name || userId} disconnected`);
                }
            }
        } catch (err) {
            console.error('Error in disconnect:', err);
        }
    });

    // ---------- ERROR HANDLING ----------
    socket.on('error', (error) => {
        console.error(`⚠️ Socket error (${socket.id}):`, error.message || error);
    });
});

// ==================== START SERVER ====================

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

ioServer.listen(PORT, HOST, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   💬 KOITUS PRODUCTION SERVER                            ║
║                                                           ║
║   Port:     ${String(PORT).padEnd(45)}║
║   Redis:    ${redisAvailable ? '✅ Connected'.padEnd(45) : '⚠️  Memory-only'.padEnd(45)}║
║   CORS:     ${allowedOrigins.join(', ').substring(0, 42).padEnd(45)}║
║                                                           ║
║   Features:                                               ║
║   ✓ Real-time messaging (Socket.io)                      ║
║   ✓ Typing indicators                                    ║
║   ✓ Read receipts                                        ║
║   ✓ Video/Audio calls (WebRTC)                           ║
║   ✓ User presence                                        ║
║   ✓ Redis persistence                                    ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);
});

// ==================== GRACEFUL SHUTDOWN ====================

process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    ioServer.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    ioServer.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason);
});
