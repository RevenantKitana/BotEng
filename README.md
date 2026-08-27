# Study Buddy Bot Backend

An AI-powered chatbot backend for language learning practice, focused on family-related conversations. Uses Groq API for natural conversational responses, with keyword matching fallback. Perfect for engaging students in speaking/writing practice with a fixed 2-minute timer.

## Features

✅ **AI-Powered Responses** - Groq API for natural, conversational replies  
✅ **Smart Fallback** - Keyword matching when API unavailable  
✅ **Session Management** - Temporary in-memory storage with auto-cleanup  
✅ **2-Minute Timer** - Automatic conversation end  
✅ **Conversation Context** - Bot remembers previous messages in session  
✅ **Input Validation** - Prevents empty messages  
✅ **CORS Enabled** - Ready for frontend integration  
✅ **Render-Ready** - Deploy with one click  

## Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Groq API Key (free at https://console.groq.com)

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file (or set via Render dashboard):

```env
PORT=3000
NODE_ENV=production
GROQ_API_KEY=your_groq_api_key_here
```

Get your free Groq API key: https://console.groq.com/keys

### Local Development

```bash
npm run dev
```

### Production

```bash
npm start
```

---

## API Endpoints

### 1. Start a New Conversation

**POST** `/start`

Initiates a new 2-minute chat session.

**Response:**
```json
{
  "sessionId": "session_1693234567890_abc123def",
  "message": "Who in your family supports you most? How do they show it?",
  "timeLimit": 120,
  "timestamp": "2024-08-27T10:30:00.000Z"
}
```

---

### 2. Send a Message

**POST** `/chat`

Send a user message and get bot response with keyword matching.

**Request Body:**
```json
{
  "sessionId": "session_1693234567890_abc123def",
  "message": "My mom helps me a lot"
}
```

**Response:**
```json
{
  "sessionId": "session_1693234567890_abc123def",
  "botMessage": "That's wonderful! Can you tell me more about what your mother does to make you feel supported?",
  "isEnded": false,
  "elapsedTime": 5.234,
  "timestamp": "2024-08-27T10:30:05.234Z"
}
```

**Error Responses:**
- `400 Bad Request` - Missing sessionId or empty message
- `404 Not Found` - Session doesn't exist
- `400 Bad Request` - Session already ended or time expired

---

### 3. Get Session Details

**GET** `/session/:sessionId`

Retrieve full session info and conversation history.

**Response:**
```json
{
  "sessionId": "session_1693234567890_abc123def",
  "isActive": true,
  "elapsedTime": 45.123,
  "timeLimit": 120,
  "startTime": "2024-08-27T10:30:00.000Z",
  "conversationHistory": [
    {
      "user": "My mom helps me",
      "bot": "That's wonderful! Can you tell me more...",
      "timestamp": "2024-08-27T10:30:05.234Z"
    }
  ]
}
```

---

### 4. End Session Early

**DELETE** `/session/:sessionId`

Force end a session before the timer expires.

**Response:**
```json
{
  "message": "Session ended",
  "sessionId": "session_1693234567890_abc123def"
}
```

---

### 5. Health Check

**GET** `/health`

Simple health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-08-27T10:30:00.000Z"
}
```

---

## Keyword Matching Logic

The bot matches user input against predefined keyword groups. Here's the priority order:

| Keyword Group | Keywords | Bot Response |
|---|---|---|
| **Mother** | mom, mother, mum | Asks about what mother does to support |
| **Father** | dad, father, pop | Asks about what father does to support |
| **Sibling** | brother, sister, bro, sis | Asks for example of sibling's support |
| **Grandparent** | grandma, grandpa, granny | Asks how grandparents show support |
| **Aunt/Uncle** | aunt, uncle, auntie | Asks what aunt/uncle does |
| **Cousin** | cousin, cousins | Asks what cousins do |
| **Family** | family, everyone, both parents | Requests specific example |
| **No Support** | no one, nobody | Ends conversation 🎉 |
| **Pet** | dog, cat, pet, puppy | Cute response + redirects to family 🐾 |
| **Friend** | friend, buddy, mate | Redirects focus to family |
| **Default** | (no match) | "That's interesting — can you tell me a bit more?" |

---

## Deployment on Render

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/study-buddy-bot.git
git push -u origin main
```

### Step 2: Create Render Service
1. Go to [render.com](https://render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Fill in:
   - **Name:** `study-buddy-bot`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free or paid

### Step 3: Set Environment Variables
- In Render dashboard → **Environment** tab
- Add `NODE_ENV=production`
- Add any other vars needed

### Step 4: Deploy
Click **"Create Web Service"** — Render will auto-deploy on every push to `main`.

---

## Testing the Backend

### Using cURL

**Start conversation:**
```bash
curl -X POST http://localhost:3000/start
```

**Send message:**
```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session_1693234567890_abc123def",
    "message": "My mom supports me"
  }'
```

### Using JavaScript/Fetch

```javascript
// Start session
const startRes = await fetch('http://localhost:3000/start', {
  method: 'POST'
});
const { sessionId } = await startRes.json();

// Send message
const chatRes = await fetch('http://localhost:3000/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId,
    message: 'My dad helps me with homework'
  })
});
const chatData = await chatRes.json();
console.log(chatData.botMessage);
```

---

## Project Structure

```
study-buddy-bot/
├── server.js                 # Main Express app
├── keywords.js               # Keyword matching logic
├── conversationManager.js     # Session & history management
├── package.json
├── .env.example
├── .gitignore
├── Procfile                  # Render deployment config
└── README.md
```

---

## Future Enhancements

- [x] ✅ Integrate Groq API for generative responses
- [ ] Persist sessions to database (PostgreSQL/MongoDB)
- [ ] Add voice/audio support
- [ ] Analytics dashboard
- [ ] Multiple language support
- [ ] User authentication
- [ ] Response evaluation & scoring
- [ ] Support for multiple AI models (OpenAI, Anthropic, etc.)
- [ ] Response streaming for real-time feedback

---

## License

MIT
