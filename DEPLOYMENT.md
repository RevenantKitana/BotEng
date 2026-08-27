# Deployment Guide - Study Buddy Bot Backend on Render

## Prerequisites

- GitHub account
- Render account (free at [render.com](https://render.com))
- Code pushed to a GitHub repository

---

## Step 1: Prepare Your Repository

### 1.1 Initialize Git (if not already done)

```bash
cd "e:\0. JOBS\BotEng"
git init
git add .
git commit -m "Initial commit: Study Buddy Bot Backend"
git branch -M main
```

### 1.2 Create GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. Create repo name: `study-buddy-bot-backend`
3. Click **Create repository**
4. Run commands from GitHub:

```bash
git remote add origin https://github.com/YOUR_USERNAME/study-buddy-bot-backend.git
git push -u origin main
```

---

## Step 2: Deploy on Render

### 2.1 Create New Web Service

1. Go to [render.com](https://render.com) and log in
2. Click **New +** → Select **Web Service**
3. Click **Connect a repository**
4. Find and select `study-buddy-bot-backend`
5. Click **Connect**

### 2.2 Configure Service

Fill in the deployment form:

| Field | Value |
|---|---|
| **Name** | `study-buddy-bot-backend` |
| **Environment** | `Node` |
| **Region** | Choose closest to your users (e.g., `Singapore`, `US East`) |
| **Branch** | `main` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Plan** | `Free` (or `Starter` for production) |

### 2.3 Add Environment Variables

Before clicking **Create Web Service**, scroll to **Environment**:

Click **Add Environment Variable**

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | (leave blank - Render auto-assigns) |

### 2.4 Deploy

Click **Create Web Service** and wait for deployment (2-3 minutes).

Once deployed, you'll see:
- ✅ Green checkmark
- 🔗 Live URL: `https://study-buddy-bot-backend-xxxx.onrender.com`

---

## Step 3: Test the Deployment

### Using cURL

```bash
# Test health endpoint
curl https://study-buddy-bot-backend-xxxx.onrender.com/health

# Start conversation
curl -X POST https://study-buddy-bot-backend-xxxx.onrender.com/start

# Send message
curl -X POST https://study-buddy-bot-backend-xxxx.onrender.com/chat \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "YOUR_SESSION_ID",
    "message": "My mom helps me"
  }'
```

### Using Node.js

```javascript
const baseUrl = 'https://study-buddy-bot-backend-xxxx.onrender.com';

// Start session
const startRes = await fetch(baseUrl + '/start', { method: 'POST' });
const { sessionId } = await startRes.json();

// Send message
const chatRes = await fetch(baseUrl + '/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId,
    message: 'My dad supports me'
  })
});
const data = await chatRes.json();
console.log(data.botMessage);
```

---

## Step 4: Use Backend URL in Frontend

Replace all `http://localhost:3000` references with your Render URL:

```javascript
const API_URL = 'https://study-buddy-bot-backend-xxxx.onrender.com';

// When starting chat
const res = await fetch(API_URL + '/start', { method: 'POST' });
```

---

## Auto-Deployment (GitHub Integration)

Every time you push to `main`:

```bash
git add .
git commit -m "Update keywords or features"
git push origin main
```

Render automatically rebuilds and redeployes within 2-3 minutes. Check deployment logs in Render dashboard.

---

## Monitoring & Logs

In Render dashboard:

1. Click your service
2. Go to **Logs** tab to see:
   - ✅ Service startup logs
   - 📊 API request logs
   - ❌ Error messages

Example logs:
```
🤖 Study Buddy Bot Backend running on port 10000
✅ Session created: session_1693234567890_abc123def
📝 Matched group: mother
```

---

## Troubleshooting

### Issue: "Build failed"

**Check build logs** in Render → Logs tab

Common fixes:
```bash
# Ensure package.json exists
npm install

# Test locally first
npm start
```

### Issue: "Service keeps crashing"

Check **Runtime logs** for errors. Ensure:
- `server.js` exists
- `start` script in `package.json` is correct
- All `require()` statements resolve

### Issue: "Port conflicts"

Render automatically assigns a port. Don't hardcode `3000`:

```javascript
const PORT = process.env.PORT || 3000; // ✅ Correct
```

### Issue: "CORS errors"

Your backend has CORS enabled. If frontend still gets errors, update Render URL in frontend code.

---

## Upgrading Plan (Free → Paid)

Free plans on Render:
- Sleep after 15 min of inactivity
- Restart takes 30 sec on next request
- 0.5GB RAM, shared CPU

For production:
1. Go to service → **Settings**
2. Click **Change Plan** → Select **Starter** or higher
3. Stays always running + better performance

---

## Environment Variables (Production)

If you need to add Groq API key or other secrets:

1. Go to **Environment** in Render dashboard
2. Click **Add Environment Variable**
3. Set key and value securely (encrypted)
4. Service auto-redeploys with new vars

Example:
```
GROQ_API_KEY=gsk_xxxxxxxxxxxxx
```

Then access in code:
```javascript
const groqKey = process.env.GROQ_API_KEY;
```

---

## Final Checklist

- ✅ Code pushed to GitHub
- ✅ Render service created and deployed
- ✅ Environment variables set
- ✅ Health endpoint responds
- ✅ `/start` and `/chat` endpoints work
- ✅ Frontend configured with Render URL
- ✅ Logs monitored for errors

**You're live! 🚀**

---

## Support

- **Render Docs:** https://render.com/docs
- **Node.js Best Practices:** https://nodejs.org/en/docs/
- **Express Guide:** https://expressjs.com/
