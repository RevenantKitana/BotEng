# Quick Start Guide

Get the Study Buddy Bot Backend running in 2 minutes! 🚀

---

## Installation

### 1. Install Dependencies

```bash
cd "e:\0. JOBS\BotEng"
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

You should see:
```
🤖 Study Buddy Bot Backend running on port 3000
Environment: development
```

---

## API Quick Test

### Option A: Using cURL (Terminal)

```bash
# Test 1: Health check
curl http://localhost:3000/health

# Test 2: Start conversation
curl -X POST http://localhost:3000/start

# Test 3: Send a message (replace SESSION_ID with actual ID from Test 2)
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "SESSION_ID_HERE",
    "message": "My mom helps me"
  }'
```

### Option B: Using Node Test Script

```bash
# In another terminal, run:
node test.js
```

This runs all 10 test scenarios automatically! ✅

### Option C: Using JavaScript/Browser Console

```javascript
// Start session
const res = await fetch('http://localhost:3000/start', {
  method: 'POST'
});
const { sessionId } = await res.json();
console.log(sessionId);

// Send message
const chatRes = await fetch('http://localhost:3000/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId,
    message: 'My dad supports me a lot'
  })
});
const chatData = await chatRes.json();
console.log(chatData.botMessage);
```

---

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| **GET** | `/health` | Health check |
| **POST** | `/start` | Start new 2-min conversation |
| **POST** | `/chat` | Send message, get response |
| **GET** | `/session/:id` | Get conversation history |
| **DELETE** | `/session/:id` | End session early |

---

## Key Features

✨ **Rule-Based Matching** - No AI needed, instant responses
🎯 **Keyword Recognition** - Mom, dad, sibling, grandparent, etc.
⏱️ **2-Minute Timer** - Auto conversation end
🧠 **Session Memory** - Stores full conversation history
🌐 **CORS Ready** - Connect any frontend
📦 **Production Ready** - Deploy to Render instantly

---

## File Structure

```
.
├── server.js              # Main Express server
├── keywords.js            # Keyword matching logic (the brain!)
├── conversationManager.js  # Session management
├── package.json           # Dependencies
├── .env.example           # Environment template
├── Procfile              # Render deployment config
├── README.md             # Full documentation
├── DEPLOYMENT.md         # Render deployment guide
├── test.js               # Test suite
└── .gitignore            # Git config
```

---

## Keyword Matching Examples

| User Says | Bot Responds |
|---|---|
| "My **mom** helps me" | "That's wonderful! Can you tell me more..." |
| "My **dad** is supportive" | "That's great! What does your father..." |
| "My **brother** is nice" | "How wonderful! Can you give me an example..." |
| "**No one** supports me" | "Time's up! Thanks for sharing. 🎉" (ends) |
| "My **dog** is cute" | "Aww, that's sweet! 🐾 Now, how does your family..." |
| "xyz abc 123" (no match) | "That's interesting — can you tell me a bit more?" |

---

## Next Steps

### For Frontend Integration

Replace `http://localhost:3000` with your Render URL:

```javascript
const API_URL = 'http://localhost:3000'; // Change to Render URL later
```

### For Deployment

1. Push code to GitHub
2. Follow [DEPLOYMENT.md](./DEPLOYMENT.md)
3. Get Render live URL
4. Update frontend with new URL

### For Customization

Edit `keywords.js` to add/modify keyword groups and responses.

---

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000
npx kill-port 3000

# Or use different port
PORT=3001 npm run dev
```

### Module Not Found
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

### Tests Failing
```bash
# Make sure server is running first
npm run dev

# In another terminal
node test.js
```

---

## Commands Reference

```bash
# Install dependencies
npm install

# Start development server (auto-restart on file changes)
npm run dev

# Start production server
npm start

# Run test suite
node test.js

# Install specific package
npm install package-name
```

---

**Ready to chat? Start the server and open a browser/terminal! 🤖**

Questions? Check [README.md](./README.md) for full API documentation.
