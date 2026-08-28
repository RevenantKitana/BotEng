# Study Buddy Bot - Integration Guide

**URL:** `https://boteng-6380.onrender.com`

## Quick Start

### JavaScript

```javascript
const API = 'https://boteng-6380.onrender.com';

// Start session
const start = await fetch(`${API}/start`, { method: 'POST' }).then(r => r.json());
const { sessionId, message } = start;

// Send message
const chat = await fetch(`${API}/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sessionId, message: 'My mom helps me' })
}).then(r => r.json());

console.log(chat.botMessage);
console.log(chat.isEnded); // true if session ended
```

### React Example

```jsx
import { useState } from 'react';

export function ChatBot() {
  const API = 'https://boteng-6380.onrender.com';
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isEnded, setIsEnded] = useState(false);

  async function start() {
    const data = await fetch(`${API}/start`, { method: 'POST' }).then(r => r.json());
    setSessionId(data.sessionId);
    setMessages([{ role: 'bot', text: data.message }]);
  }

  async function send() {
    if (!input.trim()) return;
    
    const data = await fetch(`${API}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, message: input })
    }).then(r => r.json());

    setMessages([...messages, { role: 'user', text: input }, { role: 'bot', text: data.botMessage }]);
    setInput('');
    if (data.isEnded) setIsEnded(true);
  }

  if (!sessionId) return <button onClick={start}>Start</button>;
  if (isEnded) return <div>Chat ended</div>;

  return (
    <div>
      {messages.map((m, i) => <div key={i}>{m.role}: {m.text}</div>)}
      <input value={input} onChange={e => setInput(e.target.value)} />
      <button onClick={send}>Send</button>
    </div>
  );
}
```


## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/start` | Start session → `{sessionId, message, timeLimit}` |
| POST | `/chat` | Send message → `{botMessage, isEnded, state}` |
| GET | `/session/:id` | Get session data |
| DELETE | `/session/:id` | End session |
| GET | `/health` | Health check |


## Error Codes

| Status | Error | Meaning |
|--------|-------|---------|
| 400 | Empty message | Send a message first |
| 404 | Session not found | Session expired (15 min timeout) |
| 200 + `isEnded: true` | — | Conversation ended (timer or user terminated) |

## Features

- ✅ Rule-based bot (no hard-coded responses)
- ✅ AI analysis via Groq (falls back to keywords if unavailable)
- ✅ 120-second timer per session
- ✅ No authentication required
- ✅ CORS enabled
- ✅ Full conversation history in session
- ✅ Auto-cleanup after 15 minutes

## Testing

```bash
# Start session
curl -X POST https://boteng-6380.onrender.com/start

# Send message
curl -X POST https://boteng-6380.onrender.com/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"YOUR_ID","message":"My parents help me"}'

# Check session
curl https://boteng-6380.onrender.com/session/YOUR_ID
```
