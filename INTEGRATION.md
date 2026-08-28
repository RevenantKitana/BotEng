# Study Buddy Bot - Integration Guide

**Live API:** `https://boteng-6380.onrender.com`

---

## 🎯 Quick Start

### Minimal JavaScript Logic

```javascript
const API = 'https://boteng-6380.onrender.com';
let sessionId = null;

// 1. Start chat session
async function startChat() {
  const res = await fetch(API + '/start', { method: 'POST' });
  const data = await res.json();
  sessionId = data.sessionId;
  console.log('Bot:', data.message);
  console.log('Time limit:', data.timeLimit, 'seconds');
}

// 2. Send user message & get bot response
async function sendMessage(userMessage) {
  const res = await fetch(API + '/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, message: userMessage })
  });
  const data = await res.json();
  
  console.log('Bot:', data.botMessage);
  console.log('Chat ended:', data.isEnded);
  console.log('Time remaining:', data.timeRemaining, 'seconds');
  
  return data;
}

// 3. Usage
await startChat();
await sendMessage('My mom helps me');
await sendMessage('She cooks and listens to me');
```

---

## 📡 API Reference

### 1. Start Session

**Endpoint:** `POST /start`

**Response:**
```javascript
{
  sessionId: "session_1787891273399_lmod1srrq",
  message: "Who in your family supports you most?",
  instruction: "Chat with your study buddy.",
  timeLimit: 120,
  timestamp: "2026-08-28T04:27:53.401Z"
}
```

**Logic:**
```javascript
async function startSession() {
  const res = await fetch('https://boteng-6380.onrender.com/start', {
    method: 'POST'
  });
  const data = await res.json();
  const sessionId = data.sessionId;
  return sessionId;
}
```

---

### 2. Send Message

**Endpoint:** `POST /chat`

**Request:**
```javascript
{
  sessionId: "session_1787891273399_lmod1srrq",
  message: "My mom helps me"
}
```

**Response:**
```javascript
{
  sessionId: "session_1787891273399_lmod1srrq",
  botMessage: "That's wonderful! What specifically does she help you with?",
  isEnded: false,
  elapsedTime: 12,
  timeRemaining: 108,
  state: { turn: 1, targets: ["mother"] }
}
```

**Logic:**
```javascript
async function sendMessage(sessionId, message) {
  const res = await fetch('https://boteng-6380.onrender.com/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, message })
  });
  
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error);
  }
  
  const data = await res.json();
  return {
    botMessage: data.botMessage,
    isEnded: data.isEnded,
    timeRemaining: data.timeRemaining
  };
}
```

---

### 3. Get Session Details

**Endpoint:** `GET /session/:id`

**Response:**
```javascript
{
  sessionId: "session_1787891273399_lmod1srrq",
  isActive: false,
  createdAt: "2026-08-28T04:27:53.401Z",
  endedAt: "2026-08-28T04:30:20.123Z",
  conversationHistory: [
    { role: "bot", message: "Who in your family supports you most?" },
    { role: "user", message: "My mom helps me" },
    { role: "bot", message: "That's wonderful! What specifically does she help you with?" }
  ]
}
```

**Logic:**
```javascript
async function getSessionDetails(sessionId) {
  const res = await fetch(`https://boteng-6380.onrender.com/session/${sessionId}`);
  const data = await res.json();
  return data.conversationHistory;
}
```

---

### 4. End Session

**Endpoint:** `DELETE /session/:id`

**Response:**
```javascript
{
  message: "Session terminated",
  sessionId: "session_1787891273399_lmod1srrq"
}
```

**Logic:**
```javascript
async function endSession(sessionId) {
  const res = await fetch(`https://boteng-6380.onrender.com/session/${sessionId}`, {
    method: 'DELETE'
  });
  return res.json();
}
```

---

### 5. Health Check

**Endpoint:** `GET /health`

**Response:**
```javascript
{
  status: "ok",
  timestamp: "2026-08-28T04:30:00.000Z",
  uptime: 3600
}
```

**Logic:**
```javascript
async function checkHealth() {
  const res = await fetch('https://boteng-6380.onrender.com/health');
  const data = await res.json();
  return data.status === 'ok';
}
```

---

## 🔧 Integration Examples

### Node.js Backend

```javascript
const express = require('express');
const axios = require('axios');

const app = express();
const BOT_API = 'https://boteng-6380.onrender.com';

// Proxy: Start chat
app.post('/api/start-chat', async (req, res) => {
  try {
    const response = await axios.post(`${BOT_API}/start`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to start chat' });
  }
});

// Proxy: Send message
app.post('/api/send-message', async (req, res) => {
  try {
    const { sessionId, message } = req.body;
    const response = await axios.post(`${BOT_API}/chat`, {
      sessionId,
      message
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || 'Request failed'
    });
  }
});

app.listen(3000);
```

---

### React Hook

```javascript
import { useState, useCallback } from 'react';

export function useStudyBuddy() {
  const [sessionId, setSessionId] = useState(null);
  const [isEnded, setIsEnded] = useState(false);
  const API = 'https://boteng-6380.onrender.com';

  const start = useCallback(async () => {
    const res = await fetch(`${API}/start`, { method: 'POST' });
    const data = await res.json();
    setSessionId(data.sessionId);
    return data;
  }, []);

  const send = useCallback(async (message) => {
    if (!sessionId) throw new Error('No active session');
    
    const res = await fetch(`${API}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, message })
    });
    
    const data = await res.json();
    if (data.isEnded) setIsEnded(true);
    return data;
  }, [sessionId]);

  const end = useCallback(async () => {
    if (!sessionId) return;
    await fetch(`${API}/session/${sessionId}`, { method: 'DELETE' });
    setSessionId(null);
  }, [sessionId]);

  return { start, send, end, isEnded, sessionId };
}

// Usage in component
function ChatComponent() {
  const { start, send, isEnded } = useStudyBuddy();

  async function handleStart() {
    const data = await start();
    console.log(data.message);
  }

  async function handleSend(msg) {
    const result = await send(msg);
    console.log(result.botMessage);
  }

  return (
    <div>
      <button onClick={handleStart}>Start</button>
      <input onChange={(e) => handleSend(e.target.value)} />
    </div>
  );
}
```

---

### Python Integration

```python
import requests
import json

API_URL = 'https://boteng-6380.onrender.com'

def start_chat():
    response = requests.post(f'{API_URL}/start')
    return response.json()

def send_message(session_id, message):
    response = requests.post(
        f'{API_URL}/chat',
        json={'sessionId': session_id, 'message': message},
        headers={'Content-Type': 'application/json'}
    )
    return response.json()

def get_session(session_id):
    response = requests.get(f'{API_URL}/session/{session_id}')
    return response.json()

# Usage
data = start_chat()
session_id = data['sessionId']
print('Bot:', data['message'])

result = send_message(session_id, 'My mom helps me')
print('Bot:', result['botMessage'])
print('Chat ended:', result['isEnded'])
```

---

### cURL Commands

```bash
# 1. Start session
RESPONSE=$(curl -s -X POST https://boteng-6380.onrender.com/start)
SESSION_ID=$(echo $RESPONSE | jq -r '.sessionId')
echo "Session: $SESSION_ID"

# 2. Send message
curl -X POST https://boteng-6380.onrender.com/chat \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"$SESSION_ID\",\"message\":\"My mom helps me\"}"

# 3. Get session details
curl https://boteng-6380.onrender.com/session/$SESSION_ID

# 4. End session
curl -X DELETE https://boteng-6380.onrender.com/session/$SESSION_ID

# 5. Health check
curl https://boteng-6380.onrender.com/health
```

---

## ❌ Error Handling

| Error | Status | Meaning | How to Fix |
|-------|--------|---------|-----------|
| Missing sessionId | 400 | Session ID not provided | Pass `sessionId` in request body |
| Empty message | 400 | User message is empty | Send non-empty message string |
| Session not found | 404 | Session expired or invalid | Start new session with `/start` |
| Invalid JSON | 400 | Request body is malformed | Use `JSON.stringify()` before sending |
| Groq API error | 500 | AI service unavailable | Bot falls back to keyword matching |

**Error handling example:**
```javascript
async function sendMessage(sessionId, message) {
  try {
    const res = await fetch(API + '/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, message })
    });

    if (res.status === 400) {
      const error = await res.json();
      console.error('Bad request:', error.error);
      return null;
    }

    if (res.status === 404) {
      console.error('Session expired. Start new session.');
      return null;
    }

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.error('Request failed:', error.message);
    return null;
  }
}
```

---

## 📊 Key Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `sessionId` | string | Unique session ID (needed for all requests) |
| `botMessage` | string | AI-generated response |
| `isEnded` | boolean | Whether chat session ended |
| `timeRemaining` | number | Seconds left (120 = 2 min) |
| `elapsedTime` | number | Seconds used so far |
| `message` | string | Opening message (in `/start` response) |
| `instruction` | string | User instruction |
| `timeLimit` | number | Total session duration in seconds |

---

## ⚙️ Configuration

**Base URL:** `https://boteng-6380.onrender.com`

**Headers required for POST requests:**
```javascript
{
  'Content-Type': 'application/json'
}
```

**Session timeout:** 15 minutes of inactivity  
**Message timeout:** 10 seconds  
**Max message length:** 10MB  
**Timer per session:** 120 seconds (2 minutes)

---

## 🧪 Testing Checklist

```javascript
// 1. Health check
fetch('https://boteng-6380.onrender.com/health')
  .then(r => r.json())
  .then(d => console.log('Health:', d.status))

// 2. Start session
fetch('https://boteng-6380.onrender.com/start', { method: 'POST' })
  .then(r => r.json())
  .then(d => { sessionId = d.sessionId; console.log('Started:', sessionId); })

// 3. Send message
fetch('https://boteng-6380.onrender.com/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sessionId, message: 'My mom helps me' })
})
  .then(r => r.json())
  .then(d => console.log('Bot:', d.botMessage))

// 4. Check status
fetch(`https://boteng-6380.onrender.com/session/${sessionId}`)
  .then(r => r.json())
  .then(d => console.log('History:', d.conversationHistory.length, 'messages'))
```

---

## 🚀 Deployment

Deploy your frontend anywhere (Vercel, Netlify, GitHub Pages, etc.)

**Only requirement:** Include the API endpoint in your code
```javascript
const API = 'https://boteng-6380.onrender.com';
```

**CORS is enabled** - No need for server-side proxy for frontend apps

---

## 📚 Resources

- **Live API:** https://boteng-6380.onrender.com
- **Health Check:** https://boteng-6380.onrender.com/health
- **Documentation:** [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)
- **Quick Reference:** [API_QUICK_REFERENCE.md](API_QUICK_REFERENCE.md)
