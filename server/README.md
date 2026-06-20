# 🚀 Koitus Real-Time Server Setup

## Prerequisites

- **Node.js** (v16 or higher) - [Download here](https://nodejs.org)
- **npm** (comes with Node.js)

## Installation

### Option 1: Quick Start (Windows)
1. Double-click `start-server.bat`
2. The script will install dependencies and start the server automatically

### Option 2: Manual Setup
1. Open Command Prompt or PowerShell
2. Navigate to the server folder:
   ```bash
   cd "C:\Users\Thando Hlomuka\Desktop\Koitus\server"
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the server:
   ```bash
   npm start
   ```

## Usage

Once the server is running:

1. **Open the app**: Double-click `index.html` in the main Koitus folder
2. **Sign in**: Create an account or sign in
3. **Start chatting**: Messages are now sent in real-time!
4. **Video calls**: Click the video call button to start a real video call

## Server Info

- **Port**: 3001
- **WebSocket**: ws://localhost:3001
- **API**: http://localhost:3001/api

### Endpoints

- `GET /api/health` - Server health check
- `GET /api/users` - List of online users
- `GET /api/conversations/:user1/:user2` - Conversation history
- `GET /api/calls` - Active calls

## Features

### Real-Time Messaging
- ✓ Instant message delivery via WebSocket
- ✓ Typing indicators
- ✓ Read receipts (✓ and ✓✓)
- ✓ Online/offline status
- ✓ Message history

### Video/Audio Calls (WebRTC)
- ✓ Peer-to-peer video calls
- ✓ Audio-only calls
- ✓ Mute/unmute microphone
- ✓ Camera on/off
- ✓ Call controls (end call)

## Troubleshooting

### Server won't start
- Make sure Node.js is installed
- Check if port 3001 is available
- Run as Administrator if needed

### Can't connect to server
- Make sure server is running (check console)
- Check firewall settings
- Verify localhost:3001 is accessible

### Video calls not working
- Allow camera/microphone permissions in browser
- Use HTTPS in production (WebRTC requires secure context)
- Check browser compatibility (Chrome, Firefox, Edge recommended)

## Production Deployment

For production, you'll need:

1. **HTTPS** - WebRTC requires secure connections
2. **TURN Server** - For NAT traversal in video calls
3. **Process Manager** - PM2 or similar for Node.js
4. **Reverse Proxy** - Nginx or Apache

Example TURN server config (coturn):
```bash
npm install coturn
```

Update `rtcConfig` in `script.js`:
```javascript
rtcConfig: {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { 
            urls: 'turn:your-turn-server.com',
            username: 'user',
            credential: 'pass'
        }
    ]
}
```

## Security Notes

⚠️ **Current setup is for development only!**

For production:
- Enable CORS only for trusted origins
- Add authentication/authorization
- Use environment variables for secrets
- Implement rate limiting
- Add message validation
- Use secure WebSocket (wss://)

## Support

For issues or questions:
- Check console logs for errors
- Review Socket.io and WebRTC documentation
- Test with multiple browser tabs for local testing

---

**Koitus Team** © 2026
