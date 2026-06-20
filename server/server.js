/* ==================== KOITUS REAL-TIME SERVER ====================
 * Real-time chat and video call server using Socket.io and WebRTC
 * Developed by: Koitus Team
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const ioServer = http.createServer(app);

// Socket.io with CORS
const io = new Server(ioServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.static(path.join(__dirname, '..')));

// ==================== STATE MANAGEMENT ====================
const users = new Map(); // userId -> { socketId, name, avatar, online, status }
const conversations = new Map(); // conversationId -> { participants, messages }
const activeCalls = new Map(); // callId -> { caller, receiver, type, startedAt }

// ==================== SOCKET.IO CONNECTION ====================
io.on('connection', (socket) => {
    console.log(`🟢 User connected: ${socket.id}`);

    // User joins the platform
    socket.on('user_join', (userData) => {
        const userId = userData.id || uuidv4();
        
        users.set(userId, {
            id: userId,
            socketId: socket.id,
            name: userData.name || 'User',
            avatar: userData.avatar || '',
            type: userData.type || 'general',
            online: true,
            status: 'online',
            coords: userData.coords
        });

        socket.userId = userId;
        socket.join(`user:${userId}`);

        // Broadcast user online status
        io.emit('user_online', { userId, socketId: socket.id });

        // Send back user list
        io.emit('users_list', Array.from(users.values()));

        console.log(`✅ User ${userData.name} joined with ID: ${userId}`);
    });

    // ==================== REAL-TIME MESSAGING ====================
    
    // Send message
    socket.on('send_message', (data) => {
        const { from, to, text, type = 'text' } = data;
        
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

        // Store message in conversation
        const convId = [from, to].sort().join('_');
        if (!conversations.has(convId)) {
            conversations.set(convId, { id: convId, participants: [from, to], messages: [] });
        }
        conversations.get(convId).messages.push(message);

        // Send to recipient in real-time
        const recipient = users.get(to);
        if (recipient && recipient.socketId) {
            io.to(recipient.socketId).emit('receive_message', message);
            
            // Send notification
            io.to(recipient.socketId).emit('notification', {
                type: 'message',
                from,
                text: 'New message',
                timestamp: Date.now()
            });
        }

        // Confirm delivery to sender
        socket.emit('message_delivered', { messageId: message.id, delivered: true });

        console.log(`📨 Message from ${from} to ${to}: ${text.substring(0, 50)}...`);
    });

    // Mark message as read
    socket.on('mark_read', (data) => {
        const { messageId, conversationId } = data;
        
        // Find and update message
        const conv = conversations.get(conversationId);
        if (conv) {
            const msg = conv.messages.find(m => m.id === messageId);
            if (msg) {
                msg.read = true;
                
                // Notify sender
                const otherUserId = conv.participants.find(p => p !== socket.userId);
                const otherUser = users.get(otherUserId);
                if (otherUser) {
                    io.to(otherUser.socketId).emit('message_read', { messageId });
                }
            }
        }
    });

    // Typing indicator
    socket.on('typing_start', (data) => {
        const { from, to } = data;
        const recipient = users.get(to);
        if (recipient) {
            io.to(recipient.socketId).emit('user_typing', { from, typing: true });
        }
    });

    socket.on('typing_stop', (data) => {
        const { from, to } = data;
        const recipient = users.get(to);
        if (recipient) {
            io.to(recipient.socketId).emit('user_typing', { from, typing: false });
        }
    });

    // ==================== VIDEO CALLS (WebRTC Signaling) ====================
    
    // Initiate call
    socket.on('initiate_call', (data) => {
        const { from, to, type = 'video' } = data;
        const callId = uuidv4();
        
        const call = {
            id: callId,
            caller: from,
            receiver: to,
            type,
            startedAt: Date.now(),
            status: 'initiated'
        };
        
        activeCalls.set(callId, call);
        
        const recipient = users.get(to);
        if (recipient) {
            io.to(recipient.socketId).emit('incoming_call', {
                callId,
                from,
                type,
                callerName: users.get(from)?.name
            });
        }
        
        console.log(`📞 ${type} call initiated from ${from} to ${to}`);
    });

    // Accept call
    socket.on('accept_call', (data) => {
        const { callId, from } = data;
        const call = activeCalls.get(callId);
        
        if (call) {
            call.status = 'accepted';
            
            const caller = users.get(call.caller);
            if (caller) {
                io.to(caller.socketId).emit('call_accepted', {
                    callId,
                    receiver: from
                });
            }
        }
    });

    // Reject call
    socket.on('reject_call', (data) => {
        const { callId, from } = data;
        const call = activeCalls.get(callId);
        
        if (call) {
            call.status = 'rejected';
            activeCalls.delete(callId);
            
            const caller = users.get(call.caller);
            if (caller) {
                io.to(caller.socketId).emit('call_rejected', { callId });
            }
        }
    });

    // End call
    socket.on('end_call', (data) => {
        const { callId } = data;
        const call = activeCalls.get(callId);
        
        if (call) {
            call.status = 'ended';
            call.endedAt = Date.now();
            
            // Notify both parties
            const caller = users.get(call.caller);
            const receiver = users.get(call.receiver);
            
            if (caller) {
                io.to(caller.socketId).emit('call_ended', { callId });
            }
            if (receiver) {
                io.to(receiver.socketId).emit('call_ended', { callId });
            }
            
            activeCalls.delete(callId);
        }
    });

    // WebRTC Signaling - Offer
    socket.on('webrtc_offer', (data) => {
        const { to, offer } = data;
        const recipient = users.get(to);
        if (recipient) {
            io.to(recipient.socketId).emit('webrtc_offer', {
                from: socket.userId,
                offer
            });
        }
    });

    // WebRTC Signaling - Answer
    socket.on('webrtc_answer', (data) => {
        const { to, answer } = data;
        const recipient = users.get(to);
        if (recipient) {
            io.to(recipient.socketId).emit('webrtc_answer', {
                from: socket.userId,
                answer
            });
        }
    });

    // WebRTC Signaling - ICE Candidate
    socket.on('webrtc_ice_candidate', (data) => {
        const { to, candidate } = data;
        const recipient = users.get(to);
        if (recipient) {
            io.to(recipient.socketId).emit('webrtc_ice_candidate', {
                from: socket.userId,
                candidate
            });
        }
    });

    // ==================== USER STATUS ====================
    
    // User status update
    socket.on('status_update', (data) => {
        const user = users.get(socket.userId);
        if (user) {
            user.status = data.status;
            io.emit('user_status_changed', { userId: socket.userId, status: data.status });
        }
    });

    // Disconnect
    socket.on('disconnect', () => {
        const user = users.get(socket.userId);
        if (user) {
            user.online = false;
            user.status = 'offline';
            
            io.emit('user_offline', { userId: socket.userId });
            console.log(`🔴 User ${user.name} disconnected`);
        }
    });

    // Error handling
    socket.on('error', (error) => {
        console.error(`Socket error:`, error);
    });
});

// ==================== REST API ENDPOINTS ====================

// Get all users
app.get('/api/users', (req, res) => {
    res.json(Array.from(users.values()));
});

// Get user by ID
app.get('/api/users/:id', (req, res) => {
    const user = users.get(req.params.id);
    if (user) {
        res.json(user);
    } else {
        res.status(404).json({ error: 'User not found' });
    }
});

// Get conversation history
app.get('/api/conversations/:userId1/:userId2', (req, res) => {
    const { userId1, userId2 } = req.params;
    const convId = [userId1, userId2].sort().join('_');
    const conversation = conversations.get(convId);
    
    if (conversation) {
        res.json(conversation);
    } else {
        res.json({ id: convId, participants: [userId1, userId2], messages: [] });
    }
});

// Get active calls
app.get('/api/calls', (req, res) => {
    res.json(Array.from(activeCalls.values()));
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        users: users.size,
        conversations: conversations.size,
        activeCalls: activeCalls.size,
        timestamp: Date.now()
    });
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 3001;

ioServer.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   💬 KOITUS REAL-TIME SERVER                             ║
║                                                           ║
║   Server running on port ${PORT}                           ║
║   WebSocket: ws://localhost:${PORT}                        ║
║                                                           ║
║   Features:                                               ║
║   ✓ Real-time messaging                                   ║
║   ✓ Typing indicators                                     ║
║   ✓ Read receipts                                         ║
║   ✓ Video/Audio calls (WebRTC)                           ║
║   ✓ User presence                                         ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    ioServer.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
