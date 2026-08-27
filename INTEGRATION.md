# Integration Guide - Study Buddy Bot Backend

**Backend URL:** `https://boteng-6380.onrender.com`

> 🤖 **AI-Powered Responses** — Bot uses Groq API for natural, conversational responses. Falls back to keyword matching if API is unavailable.

---

## Quick Setup (Frontend)

### JavaScript/React Integration

```javascript
const API_URL = 'https://boteng-6380.onrender.com';

// 1. Start conversation
async function startChat() {
  const res = await fetch(`${API_URL}/start`, { method: 'POST' });
  const { sessionId, message, timeLimit } = await res.json();
  
  console.log('Bot:', message);
  console.log('Session ID:', sessionId);
  console.log('Time Limit:', timeLimit, 'seconds');
  
  return sessionId;
}

// 2. Send message and get response
async function sendMessage(sessionId, userMessage) {
  const res = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      message: userMessage
    })
  });
  
  if (!res.ok) {
    const error = await res.json();
    console.error('Error:', error.error);
    return null;
  }
  
  const { botMessage, isEnded, elapsedTime } = await res.json();
  console.log('Bot:', botMessage);
  console.log('Time:', formatTime(elapsedTime));
  
  return { botMessage, isEnded, elapsedTime };
}

// 3. Get session details
async function getSession(sessionId) {
  const res = await fetch(`${API_URL}/session/${sessionId}`);
  const session = await res.json();
  return session;
}

// 4. End session early
async function endSession(sessionId) {
  const res = await fetch(`${API_URL}/session/${sessionId}`, {
    method: 'DELETE'
  });
  return await res.json();
}

// Helper: Format seconds to MM:SS
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Usage Example
async function main() {
  try {
    // Start chat
    const sessionId = await startChat();
    
    // Send message
    const res1 = await sendMessage(sessionId, 'My mom helps me');
    
    // Check if session ended
    if (res1.isEnded) {
      console.log('Chat ended');
      return;
    }
    
    // Send another message
    const res2 = await sendMessage(sessionId, 'She listens to my problems');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
```

---

## React Component Example

```jsx
import { useState, useEffect } from 'react';

const API_URL = 'https://boteng-6380.onrender.com';

export function ChatBot() {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(120);

  useEffect(() => {
    let interval;
    if (isStarted && !isEnded) {
      interval = setInterval(() => {
        setTimeRemaining(prev => Math.max(0, prev - 0.1));
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isStarted, isEnded]);

  async function handleStart() {
    try {
      const res = await fetch(`${API_URL}/start`, { method: 'POST' });
      const data = await res.json();
      setSessionId(data.sessionId);
      setMessages([{ type: 'bot', text: data.message }]);
      setIsStarted(true);
      setTimeRemaining(120);
    } catch (error) {
      alert('Error starting chat: ' + error.message);
    }
  }

  async function handleSendMessage() {
    if (!input.trim()) {
      alert('Type an answer first');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: input })
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error);
        return;
      }

      const data = await res.json();
      setMessages(prev => [
        ...prev,
        { type: 'user', text: input },
        { type: 'bot', text: data.botMessage }
      ]);
      setInput('');
      setTimeRemaining(120 - data.elapsedTime);

      if (data.isEnded) {
        setIsEnded(true);
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (!isStarted) {
    return (
      <div className="chat-start">
        <h1>📚 Study Buddy Bot</h1>
        <button onClick={handleStart}>Start chatting →</button>
      </div>
    );
  }

  if (isEnded) {
    return (
      <div className="chat-end">
        <h2>✅ Chat Ended</h2>
        <p>Thanks for practicing!</p>
        <button onClick={() => window.location.reload()}>Continue →</button>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="timer">⏱️ {formatTime(timeRemaining)}</div>
      
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message message-${msg.type}`}>
            {msg.type === 'bot' && '🤖 '}
            {msg.text}
          </div>
        ))}
      </div>

      <div className="input-area">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Type your answer..."
          disabled={isEnded}
        />
        <button onClick={handleSendMessage} disabled={isEnded}>
          Send
        </button>
      </div>
    </div>
  );
}
```

---

## CSS Styling (Optional)

```css
.chat-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.timer {
  text-align: right;
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 20px;
  color: #f44336;
}

.messages {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  height: 400px;
  overflow-y: auto;
  margin-bottom: 15px;
  background: #f9f9f9;
}

.message {
  margin-bottom: 12px;
  padding: 8px 12px;
  border-radius: 6px;
  word-wrap: break-word;
}

.message-user {
  background: #2196F3;
  color: white;
  text-align: right;
  margin-left: 60px;
}

.message-bot {
  background: #e0e0e0;
  color: #333;
  margin-right: 60px;
}

.input-area {
  display: flex;
  gap: 10px;
}

.input-area input {
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.input-area button {
  padding: 10px 20px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
}

.input-area button:hover {
  background: #45a049;
}

.input-area button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.chat-start, .chat-end {
  text-align: center;
  padding: 40px 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.chat-start h1, .chat-end h2 {
  color: #333;
  margin-bottom: 30px;
}

.chat-start button, .chat-end button {
  padding: 12px 30px;
  font-size: 16px;
  background: #2196F3;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
}

.chat-start button:hover, .chat-end button:hover {
  background: #0b7dda;
}
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| **POST** | `/start` | Start new session |
| **POST** | `/chat` | Send message |
| **GET** | `/session/:id` | Get session details |
| **DELETE** | `/session/:id` | End session |
| **GET** | `/health` | Health check |
| **GET** | `/checkhealth` | Detailed health check |

---

## Error Handling

```javascript
async function sendMessageSafe(sessionId, message) {
  try {
    const res = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, message })
    });

    // Check for errors
    if (res.status === 400) {
      const error = await res.json();
      if (error.error === 'Type an answer first') {
        console.warn('Empty message');
        return { error: 'Please type something' };
      }
    }

    if (res.status === 404) {
      return { error: 'Session not found or expired' };
    }

    if (!res.ok) {
      return { error: 'Server error' };
    }

    return await res.json();
  } catch (error) {
    return { error: 'Network error: ' + error.message };
  }
}
```

---

## Testing

### Using cURL

```bash
# Health check
curl https://boteng-6380.onrender.com/health

# Start chat
curl -X POST https://boteng-6380.onrender.com/start

# Send message (replace SESSION_ID)
curl -X POST https://boteng-6380.onrender.com/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"SESSION_ID","message":"My mom helps me"}'
```

### Using Browser Console

```javascript
const res = await fetch('https://boteng-6380.onrender.com/start', { method: 'POST' });
const data = await res.json();
console.log(data);
```

---

## Key Points

✅ **No CORS issues** — Backend has CORS enabled  
✅ **No auth needed** — Open access  
✅ **2-minute timer** — Auto-ends conversations  
✅ **Keyword matching** — Family-focused responses  
✅ **Memory storage** — Full conversation history  
✅ **Production ready** — Already deployed on Render  

---

## Support

- Backend URL: https://boteng-6380.onrender.com
- Repository: (add your GitHub link)
- Issues: (add your contact info)
