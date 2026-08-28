# Study Buddy Bot - Complete Integration Guide

## Table of Contents
1. [Overview](#overview)
2. [API Reference](#api-reference)
3. [Quick Start](#quick-start)
4. [Implementation Examples](#implementation-examples)
5. [AI Integration (Groq)](#ai-integration-groq)
6. [Deployment](#deployment)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## Overview

**Study Buddy Bot Backend** is a conversational AI service for language learning practice, focused on family-related discussions.

### Key Features
- 🤖 **AI-Powered Responses** - Using Groq Mixtral API for natural conversations
- ⏱️ **Timed Sessions** - 120-second (2-minute) conversations per session
- 🔄 **Stateful Management** - Full session history and context tracking
- 📊 **Rule-Based Analysis** - Classification + rule engine + fallback patterns
- 🎯 **Family-Focused** - Contextual topic filtering for family support discussions
- 🔀 **Fallback System** - Graceful degradation if AI unavailable

### Technology Stack
- **Backend**: Node.js 20.x + Express.js
- **AI Provider**: Groq Mixtral-8x7b-32768
- **JSON API**: RESTful endpoints with CORS
- **Hosting**: Render (https://render.com)

### Live Service
```
🔗 https://boteng-6380.onrender.com
```

---

## API Reference

### Endpoint: POST `/start`
Start a new conversation session

**Request:**
```bash
POST /start
Content-Type: application/json
```

**Response (200 OK):**
```json
{
  "sessionId": "session_1787891273399_lmod1srrq",
  "message": "Who in your family supports you most?",
  "instruction": "Chat with your study buddy.",
  "timeLimit": 120,
  "timestamp": "2026-08-28T04:27:53.401Z"
}
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `sessionId` | string | Unique session identifier (save this) |
| `message` | string | Opening message from bot |
| `instruction` | string | User instruction |
| `timeLimit` | number | Session duration in seconds (120 = 2 min) |
| `timestamp` | string | ISO 8601 timestamp |

---

### Endpoint: POST `/chat`
Send a user message and get bot response

**Request:**
```bash
POST /chat
Content-Type: application/json

{
  "sessionId": "session_1787891273399_lmod1srrq",
  "message": "My mom helps me with homework"
}
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sessionId` | string | ✅ Yes | Session ID from `/start` |
| `message` | string | ✅ Yes | User's message (min 1 char) |

**Response (200 OK):**
```json
{
  "sessionId": "session_1787891273399_lmod1srrq",
  "botMessage": "That's wonderful! What specifically does she help you with?",
  "isEnded": false,
  "elapsedTime": 12,
  "timeRemaining": 108,
  "state": {
    "turn": 1,
    "targets": ["mother", "support", "assistance"],
    "checklist": {"mother": true}
  }
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `sessionId` | string | Echo of request session ID |
| `botMessage` | string | Bot's natural response |
| `isEnded` | boolean | true = session ended (time up or natural close) |
| `elapsedTime` | number | Seconds elapsed |
| `timeRemaining` | number | Seconds left |
| `state` | object | Internal bot state (for analytics) |

---

### Endpoint: GET `/session/:id`
Retrieve full session details

**Request:**
```bash
GET /session/session_1787891273399_lmod1srrq
```

**Response (200 OK):**
```json
{
  "sessionId": "session_1787891273399_lmod1srrq",
  "isActive": false,
  "createdAt": "2026-08-28T04:27:53.401Z",
  "endedAt": "2026-08-28T04:30:20.123Z",
  "conversationHistory": [
    {
      "role": "bot",
      "message": "Who in your family supports you most?",
      "timestamp": "2026-08-28T04:27:53.401Z"
    },
    {
      "role": "user",
      "message": "My mom helps me",
      "timestamp": "2026-08-28T04:28:07.671Z"
    },
    {
      "role": "bot",
      "message": "That's wonderful! What specifically does she help you with?",
      "timestamp": "2026-08-28T04:28:07.750Z"
    }
  ]
}
```

---

### Endpoint: DELETE `/session/:id`
Manually end a session

**Request:**
```bash
DELETE /session/session_1787891273399_lmod1srrq
```

**Response (200 OK):**
```json
{
  "message": "Session terminated",
  "sessionId": "session_1787891273399_lmod1srrq"
}
```

---

### Endpoint: GET `/health`
Health check (monitoring)

**Request:**
```bash
GET /health
```

**Response (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2026-08-28T04:30:00.000Z",
  "uptime": 3600
}
```

---

### Error Responses

#### 400 Bad Request - Missing Session ID
```json
{
  "error": "Missing sessionId"
}
```

#### 400 Bad Request - Empty Message
```json
{
  "error": "Type an answer first."
}
```

#### 400 Bad Request - Malformed JSON
```json
{
  "error": "Invalid JSON in request body. Ensure your request is valid JSON.",
  "details": "Unexpected token \\ in JSON at position 1"
}
```

#### 404 Not Found - Session Expired
```json
{
  "error": "Session not found"
}
```
**Note:** Sessions auto-expire after 15 minutes of inactivity

#### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

---

## Quick Start

### 1️⃣ Vanilla JavaScript (Browser)

```javascript
const API = 'https://boteng-6380.onrender.com';

// Start session
async function startChat() {
  const response = await fetch(`${API}/start`, { 
    method: 'POST' 
  });
  const data = await response.json();
  
  console.log(`Bot: ${data.message}`);
  console.log(`Session ID: ${data.sessionId}`);
  return data.sessionId;
}

// Send message
async function sendMessage(sessionId, userMessage) {
  const response = await fetch(`${API}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      message: userMessage
    })
  });
  
  const data = await response.json();
  console.log(`Bot: ${data.botMessage}`);
  
  if (data.isEnded) {
    console.log('Chat session ended');
  }
  
  return data;
}

// Usage
const sid = await startChat();
await sendMessage(sid, 'My mom helps me');
```

---

### 2️⃣ React Component

```jsx
import { useState, useEffect } from 'react';

export function ChatBot() {
  const API = 'https://boteng-6380.onrender.com';
  
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isEnded, setIsEnded] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(120);
  const [loading, setLoading] = useState(false);

  // Start new session
  async function handleStart() {
    try {
      setLoading(true);
      const response = await fetch(`${API}/start`, { method: 'POST' });
      const data = await response.json();
      
      setSessionId(data.sessionId);
      setMessages([{ 
        role: 'bot', 
        text: data.message,
        timestamp: new Date()
      }]);
      setTimeRemaining(data.timeLimit);
      setIsEnded(false);
    } catch (error) {
      alert('Failed to start chat: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  // Send message
  async function handleSend() {
    if (!input.trim() || !sessionId) return;
    
    const userMessage = input.trim();
    setInput('');
    setLoading(true);
    
    try {
      const response = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: userMessage })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }
      
      const data = await response.json();
      
      // Add messages to history
      setMessages(prev => [
        ...prev,
        { role: 'user', text: userMessage, timestamp: new Date() },
        { role: 'bot', text: data.botMessage, timestamp: new Date() }
      ]);
      
      setTimeRemaining(data.timeRemaining);
      
      if (data.isEnded) {
        setIsEnded(true);
      }
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  // Handle Enter key
  function handleKeyPress(e) {
    if (e.key === 'Enter' && !loading) {
      handleSend();
    }
  }

  if (!sessionId) {
    return (
      <div className="chat-container">
        <h1>Study Buddy Bot</h1>
        <button onClick={handleStart} disabled={loading}>
          {loading ? 'Starting...' : 'Start Chat'}
        </button>
      </div>
    );
  }

  if (isEnded) {
    return (
      <div className="chat-container">
        <h1>Chat Ended</h1>
        <p>Thanks for the conversation!</p>
        <button onClick={handleStart}>Start New Chat</button>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h1>Study Buddy</h1>
        <div className="timer">⏱️ {Math.ceil(timeRemaining)}s</div>
      </div>
      
      <div className="messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            {msg.text}
          </div>
        ))}
      </div>
      
      <div className="input-area">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          disabled={loading}
        />
        <button 
          onClick={handleSend} 
          disabled={loading || !input.trim()}
        >
          {loading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
```

**Styling:**
```css
.chat-container {
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 600px;
}

.chat-header {
  background: #007bff;
  color: white;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.timer {
  font-size: 14px;
  font-weight: bold;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #f9f9f9;
}

.message {
  margin: 8px 0;
  padding: 8px 12px;
  border-radius: 6px;
  word-wrap: break-word;
}

.message.user {
  background: #007bff;
  color: white;
  text-align: right;
  margin-left: 40px;
}

.message.bot {
  background: #e9ecef;
  color: #333;
  margin-right: 40px;
}

.input-area {
  display: flex;
  gap: 8px;
  padding: 12px;
  background: white;
  border-top: 1px solid #ddd;
}

.input-area input {
  flex: 1;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.input-area button {
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.input-area button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

---

### 3️⃣ Node.js/Express Backend

```javascript
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const BOT_API = 'https://boteng-6380.onrender.com';

// Proxy endpoint to integrate with your backend
app.post('/api/chat/start', async (req, res) => {
  try {
    const response = await axios.post(`${BOT_API}/start`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to start chat' });
  }
});

app.post('/api/chat/send', async (req, res) => {
  try {
    const { sessionId, message } = req.body;
    const response = await axios.post(`${BOT_API}/chat`, {
      sessionId,
      message
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || 'Chat failed'
    });
  }
});

app.listen(3001, () => console.log('Server running on :3001'));
```

---

### 4️⃣ cURL Commands

```bash
# Start session
curl -X POST https://boteng-6380.onrender.com/start \
  -H "Content-Type: application/json"

# Send message (replace SESSION_ID with actual ID)
curl -X POST https://boteng-6380.onrender.com/chat \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session_1787891273399_lmod1srrq",
    "message": "My mother supports me"
  }'

# Get session details
curl https://boteng-6380.onrender.com/session/session_1787891273399_lmod1srrq

# End session
curl -X DELETE https://boteng-6380.onrender.com/session/session_1787891273399_lmod1srrq

# Health check
curl https://boteng-6380.onrender.com/health
```

---

## Implementation Examples

### Client Class Wrapper (TypeScript)

```typescript
interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

interface ChatResponse {
  sessionId: string;
  botMessage: string;
  isEnded: boolean;
  timeRemaining: number;
  elapsedTime: number;
}

export class StudyBuddyClient {
  private apiUrl: string;
  private sessionId: string | null = null;

  constructor(apiUrl = 'https://boteng-6380.onrender.com') {
    this.apiUrl = apiUrl;
  }

  async start(): Promise<{ message: string; timeLimit: number }> {
    const response = await fetch(`${this.apiUrl}/start`, {
      method: 'POST'
    });
    
    if (!response.ok) throw new Error('Failed to start chat');
    
    const data = await response.json();
    this.sessionId = data.sessionId;
    
    return {
      message: data.message,
      timeLimit: data.timeLimit
    };
  }

  async send(message: string): Promise<ChatResponse> {
    if (!this.sessionId) {
      throw new Error('No active session. Call start() first.');
    }

    const response = await fetch(`${this.apiUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: this.sessionId,
        message
      })
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return response.json();
  }

  async end(): Promise<void> {
    if (!this.sessionId) return;
    
    await fetch(`${this.apiUrl}/session/${this.sessionId}`, {
      method: 'DELETE'
    });
    
    this.sessionId = null;
  }

  isActive(): boolean {
    return !!this.sessionId;
  }
}

// Usage
const bot = new StudyBuddyClient();
await bot.start();
const response = await bot.send('My mother helps me');
console.log(response.botMessage);
await bot.end();
```

---

## AI Integration (Groq)

### How AI Responses Work

The bot uses a **hybrid approach**:

```
User Message
    ↓
┌─────────────────────────────┐
│ 1. Rule-Based Analysis      │
│  - Classify message type    │
│  - Extract entities/targets │
│  - Apply business rules     │
└──────────┬──────────────────┘
           ↓
       Next Step?
      /         \
    AI?         Keyword
   (if          Fallback
   key set)
    ↓              ↓
┌──────────┐  ┌──────────────┐
│ Groq API │  │ Rule-Based   │
│ Call     │  │ Response     │
└────┬─────┘  └──────────────┘
     ↓              ↓
     └──────┬───────┘
            ↓
    Generate Response
```

### Setting Up Groq API

#### Step 1: Get API Key

1. Visit https://console.groq.com
2. Sign up with Google/GitHub (free)
3. Go to **API Keys**
4. Create new key
5. Copy key (format: `gsk_xxxxxxxxxxxxxx`)

#### Step 2: Configure Locally

**File: `.env`**
```env
PORT=3000
NODE_ENV=development
GROQ_API_KEY=gsk_xxxxxxxxxxxxxx
```

Start server:
```bash
npm run dev
# Expected output:
# ✅ Bot configuration loaded successfully
# 🤖 Study Buddy Bot Backend running on port 3000
```

#### Step 3: Deploy to Render

1. Go to Render Dashboard
2. Select your service
3. **Settings** → **Environment**
4. Add variable:
   ```
   Key: GROQ_API_KEY
   Value: gsk_xxxxxxxxxxxxxx
   ```
5. Service auto-redeploys

#### Step 4: Verify

Check logs for:
```
✅ Bot configuration loaded successfully
✅ Groq API is available
```

OR check for issues:
```
⚠️ Groq API key not configured
🤖 Using fallback keyword responses
```

### Configuration Options

**File: `groqClient.js`**

```javascript
class GroqClient {
  constructor(apiKey = process.env.GROQ_API_KEY) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.groq.com/openai/v1';
    this.model = 'mixtral-8x7b-32768'; // ← Change model here
    
    // Parameters
    this.temperature = 0.7;      // Creativity (0.0-1.0)
    this.maxTokens = 150;        // Response length
    this.topP = 0.9;            // Diversity
    this.timeout = 10000;        // 10 seconds
  }
}
```

**Tuning Guide:**
| Parameter | Value | Effect |
|-----------|-------|--------|
| `temperature` | 0.0 | Deterministic (same question = same answer) |
| `temperature` | 0.7 | Balanced (default) |
| `temperature` | 1.0 | Creative (different answers each time) |
| `maxTokens` | 50 | Short responses (~20 words) |
| `maxTokens` | 150 | Medium (default) (~50 words) |
| `maxTokens` | 500 | Long responses (~200 words) |

### System Prompt

The bot uses this system prompt:

```
You are a friendly and encouraging study buddy chatbot helping 
students practice English by discussing family members who support 
them.

Your role:
- Ask follow-up questions about how family members support them
- Show genuine interest and encouragement
- Keep responses warm, conversational, and age-appropriate
- Gently redirect if they mention non-family topics back to family
- Be empathetic and supportive

Important: Keep responses concise (1-2 sentences), conversational, 
and natural.
```

To customize, edit `groqClient.js` → `systemPrompt` variable

---

## Deployment

### Option 1: Render (Recommended)

Render provides free, easy deployment with auto-scaling.

#### Prerequisites
- GitHub account (code must be in repo)
- Render account (free at render.com)

#### Steps

**1. Prepare Repository**
```bash
git init
git add .
git commit -m "Initial: Study Buddy Bot"
git remote add origin https://github.com/YOUR_USERNAME/study-buddy-bot-backend.git
git push -u origin main
```

**2. Connect to Render**
- Go to https://render.com
- Click **New +** → **Web Service**
- Select your GitHub repository
- Click **Connect**

**3. Configure**

| Setting | Value |
|---------|-------|
| Name | `study-buddy-bot-backend` |
| Environment | `Node` |
| Region | Closest to users |
| Branch | `main` |
| Build Command | `npm install` |
| Start Command | `npm start` |

**4. Environment Variables**

Add before deploying:

```
NODE_ENV=production
GROQ_API_KEY=gsk_xxxxxxxxxxxxxx
```

**5. Deploy**

Click **Create Web Service** and wait 2-3 minutes.

Your URL: `https://study-buddy-bot-backend-xxxx.onrender.com`

**6. Auto-Deployment**

Every `git push` to `main` automatically redeploys.

---

### Option 2: Docker (Self-Hosted)

**Dockerfile:**
```dockerfile
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000
CMD ["npm", "start"]
```

**Build & Run:**
```bash
docker build -t study-buddy-bot .
docker run -p 3000:3000 \
  -e GROQ_API_KEY=gsk_xxxxxx \
  -e NODE_ENV=production \
  study-buddy-bot
```

---

### Option 3: Heroku (Legacy but works)

```bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login

# Create app
heroku create study-buddy-bot-backend

# Set environment variables
heroku config:set GROQ_API_KEY=gsk_xxxxxx
heroku config:set NODE_ENV=production

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

---

## Testing

### Unit Tests

**File: `test.js`**
```bash
npm test
```

### Integration Tests

**File: `test-new-architecture.js`**
```bash
npm run test:integration
```

### Manual Testing

#### Test 1: Health Check
```bash
curl https://boteng-6380.onrender.com/health
```

Expected:
```json
{ "status": "ok" }
```

#### Test 2: Full Conversation Flow
```bash
# 1. Start
curl -X POST https://boteng-6380.onrender.com/start

# Save SESSION_ID from response

# 2. Send message
curl -X POST https://boteng-6380.onrender.com/chat \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "SESSION_ID",
    "message": "My mother supports me"
  }'

# 3. Check session
curl https://boteng-6380.onrender.com/session/SESSION_ID
```

#### Test 3: Load Test
```bash
# Install Apache Bench (ab)
# macOS: brew install httpd
# Linux: apt-get install apache2-utils

# Send 100 requests
ab -n 100 -c 10 https://boteng-6380.onrender.com/start
```

---

## Troubleshooting

### Problem: 401 Unauthorized from Groq API

**Cause:** Invalid or missing API key

**Solution:**
1. Check `.env` file has `GROQ_API_KEY=gsk_xxxxx`
2. Verify key format (should start with `gsk_`)
3. Get new key from https://console.groq.com/keys
4. Restart server: `npm run dev`

### Problem: "Session not found" (404)

**Cause:** Session expired (>15 min idle) or invalid session ID

**Solution:**
1. Start new session with `/start`
2. Use session ID immediately
3. Send messages before 15-minute timeout

### Problem: JSON Parse Error

**Cause:** Malformed JSON in request body

**Solution:**
1. Check `Content-Type: application/json` header
2. Validate JSON syntax: `JSON.stringify()` before sending
3. Escape special characters properly

**Example:**
```javascript
// ❌ Wrong
fetch(url, {
  body: '{"message": "He said "hello""}'  // Unescaped quotes
});

// ✅ Correct
fetch(url, {
  body: JSON.stringify({ message: 'He said "hello"' })
});
```

### Problem: Slow Response Times

**Cause:** Groq API latency or network lag

**Solution:**
1. Check Groq status: https://status.groq.com
2. Verify network connectivity
3. Increase timeout in `groqClient.js`: `timeout: 15000`
4. Use keyword fallback mode (disable Groq)

### Problem: "Bot configuration loaded but no Groq"

**Cause:** API key not set during deployment

**Solution:**
- Render: Check **Settings** → **Environment** for `GROQ_API_KEY`
- Docker: Verify `-e GROQ_API_KEY=...` in run command
- Local: Check `.env` file exists and has key

### Problem: CORS Errors in Browser

**Cause:** Frontend origin not allowed

**Solution:**
- Server already has `cors()` enabled
- Check frontend URL matches deployment environment
- For local dev: use `http://localhost:3000`
- For production: use deployed URL

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Session startup | ~500ms |
| First message response | 1-2s (Groq + analysis) |
| Subsequent responses | 0.5-1.5s |
| Session timeout | 15 minutes inactivity |
| Concurrent sessions | Unlimited (Render scales) |
| Max message length | 10MB (configurable) |

---

## Security Considerations

✅ **Implemented:**
- No authentication required (open API)
- CORS enabled for cross-origin requests
- JSON parsing protection
- Timeout protection (15 min session)
- Request size limits (10MB)
- API key never logged

⚠️ **Notes:**
- No rate limiting (add if public)
- No request signing (add for production)
- Groq key stored in environment (secure)
- Session data in-memory (lost on restart)

---

## Support & Resources

| Resource | Link |
|----------|------|
| Groq Documentation | https://console.groq.com/docs |
| API Key Management | https://console.groq.com/keys |
| Render Dashboard | https://render.com |
| Node.js LTS | https://nodejs.org |
| Express Documentation | https://expressjs.com |

---

**Last Updated:** 2026-08-28
**Version:** 1.0.0
**Status:** Production Ready
