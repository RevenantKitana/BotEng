# Study Buddy Bot Backend

An AI-powered chatbot backend for language learning practice, focused on family-related conversations.

- 🤖 **AI Responses** - Groq Mixtral-8x7b for natural conversations
- 🔄 **Smart Fallback** - Keyword matching when API unavailable  
- ⏱️ **Timed Sessions** - 120-second (2-minute) conversations
- 📊 **Context Aware** - Remembers conversation history
- 🌐 **CORS Ready** - Cross-origin requests enabled
- 🚀 **Production Ready** - Deploy on Render, Docker, or self-hosted

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| **[INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)** | 📖 Complete integration reference (START HERE) |
| **[API_QUICK_REFERENCE.md](API_QUICK_REFERENCE.md)** | ⚡ Quick API cheatsheet |
| **[DEPLOYMENT_FIXES.md](DEPLOYMENT_FIXES.md)** | 🔧 Recent fixes & deployment checklist |
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | 🏗️ System design & architecture |
| **[QUICKSTART.md](QUICKSTART.md)** | 🚀 5-minute setup |

## 🚀 Quick Start (30 seconds)

### Installation
```bash
npm install
```

### Configure
Create `.env`:
```env
PORT=3000
GROQ_API_KEY=gsk_xxxxxxxxxxxxxx  # Get from https://console.groq.com/keys
```

### Run
```bash
npm run dev
```

### Test
```bash
curl -X POST http://localhost:3000/start
```

---

## 📡 Live API

**Endpoint:** `https://boteng-6380.onrender.com`

**Health Check:**
```bash
curl https://boteng-6380.onrender.com/health
```

---

## API Overview

See [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) for complete API reference.

### Start Session

**POST** `/start`

**See [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) for complete API reference with examples.**

### Example: Start & Chat
```javascript
const api = 'https://boteng-6380.onrender.com';
const start = await fetch(`${api}/start`, {method:'POST'}).then(r=>r.json());
const chat = await fetch(`${api}/chat`, {
  method: 'POST',
  headers: {'Content-Type':'application/json'},
  body: JSON.stringify({sessionId: start.sessionId, message: 'My mom helps me'})
}).then(r=>r.json());
console.log(chat.botMessage);
```

---

## 🏗️ Architecture

```
User Message
    ↓
Rule-Based Analysis (classification + entities)
    ↓
    ├─ Groq API (if configured) → Natural response
    ├─ Fallback (keywords) → Template response
    ↓
Bot Response + State Update
```

**Key Components:**
- `server.js` - Express API
- `groqClient.js` - AI integration
- `botEngine.js` - Rule logic
- `botAnalyzer.js` - Classification
- `conversationManager.js` - Session state
- `keywords.js` - Fallback patterns

---

## 🚀 Deployment

### Quick Deploy (Render)
```bash
git push origin main
```
Auto-deploys on every push.

**For detailed deployment:** [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md#deployment)

---

## 🔑 Environment Variables

| Variable | Required | Default | Example |
|----------|----------|---------|---------|
| `PORT` | No | 3000 | 3000 |
| `NODE_ENV` | No | development | production |
| `GROQ_API_KEY` | No | — | gsk_xxxxx |

**Get Groq Key:** https://console.groq.com/keys

---

## 📊 Performance

| Metric | Value |
|--------|-------|
| Session timeout | 15 minutes |
| Message response time | 0.5-2 seconds |
| Concurrent users | Unlimited (scales) |
| Message size limit | 10MB |

---

## ❓ Troubleshooting

**401 Unauthorized from Groq?**
→ Check `GROQ_API_KEY` in `.env` (should start with `gsk_`)

**404 Session not found?**
→ Session expired (15 min idle) - start new session

**JSON parse error?**
→ Use `JSON.stringify()` instead of string literals

**More help?** → See [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md#troubleshooting)

---

## 📖 Full Documentation

For complete information, see:
- **[INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)** - Complete reference
- **[API_QUICK_REFERENCE.md](API_QUICK_REFERENCE.md)** - Cheatsheet
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System design
- **[QUICKSTART.md](QUICKSTART.md)** - 5-minute setup
- **[DEPLOYMENT_FIXES.md](DEPLOYMENT_FIXES.md)** - Recent improvements

---

## 📝 License

MIT

**Last Updated:** 2026-08-28 | **Status:** Production Ready ✅
