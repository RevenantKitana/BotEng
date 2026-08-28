# API Quick Reference

## Live Service
```
🔗 https://boteng-6380.onrender.com
```

---

## Endpoints Summary

| Endpoint | Method | Purpose | Request | Response |
|----------|--------|---------|---------|----------|
| `/start` | POST | Begin session | — | `{sessionId, message, timeLimit}` |
| `/chat` | POST | Send message | `{sessionId, message}` | `{botMessage, isEnded, timeRemaining}` |
| `/session/:id` | GET | Get details | — | `{sessionId, conversationHistory, ...}` |
| `/session/:id` | DELETE | End session | — | `{message, sessionId}` |
| `/health` | GET | Status check | — | `{status, timestamp, uptime}` |

---

## Minimal Example (3 lines)

```javascript
const api = 'https://boteng-6380.onrender.com';
const start = await fetch(api+'/start',{method:'POST'}).then(r=>r.json());
const chat = await fetch(api+'/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:start.sessionId,message:'My mom helps me'})}).then(r=>r.json());
console.log(chat.botMessage);
```

---

## Error Codes

| Status | Meaning | Example |
|--------|---------|---------|
| 200 | Success | Message sent, response ready |
| 400 | Bad request | Missing sessionId, empty message |
| 404 | Not found | Session expired |
| 500 | Server error | Unexpected error |

---

## Testing

```bash
# Start
SESSION=$(curl -s -X POST https://boteng-6380.onrender.com/start | jq -r '.sessionId')

# Chat
curl -X POST https://boteng-6380.onrender.com/chat \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"$SESSION\",\"message\":\"My mom helps me\"}"

# Status
curl https://boteng-6380.onrender.com/session/$SESSION
```

---

## Environment Setup

**Local (.env):**
```env
PORT=3000
NODE_ENV=development
GROQ_API_KEY=gsk_xxxxxxxxxxxxx
```

**Render (Dashboard Settings):**
```
NODE_ENV = production
GROQ_API_KEY = gsk_xxxxxxxxxxxxx
```

---

## Common Issues

| Issue | Fix |
|-------|-----|
| 401 Groq error | Check `GROQ_API_KEY` format (should start with `gsk_`) |
| 404 Session error | Session expired (15 min timeout) - start new session |
| JSON parse error | Validate JSON: `JSON.stringify({sessionId,message})` |
| CORS error | Frontend is calling correct API URL |
| Slow response | Check Groq API status or increase timeout to 15s |

---

## Deploy

```bash
git push origin main  # Auto-deploys on Render
```

**URL after deploy:** https://your-service-name.onrender.com
