require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { getKeywordResponse } = require('./keywords');
const { ConversationManager } = require('./conversationManager');
const { GroqClient } = require('./groqClient');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize clients
const conversationManager = new ConversationManager();
const groqClient = new GroqClient();

// Routes

/**
 * POST /start
 * Start a new conversation session
 */
app.post('/start', (req, res) => {
  const sessionId = conversationManager.createSession();
  res.json({
    sessionId,
    message: 'Who in your family supports you most? How do they show it?',
    timeLimit: 120, // 2 minutes in seconds
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /chat
 * Send a message and get bot response
 * Body: { sessionId, message }
 */
app.post('/chat', async (req, res) => {
  const { sessionId, message } = req.body;

  // Validation
  if (!sessionId) {
    return res.status(400).json({ error: 'Missing sessionId' });
  }

  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'Type an answer first' });
  }

  // Check if session exists and is still active
  const session = conversationManager.getSession(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  if (!session.isActive) {
    return res.status(400).json({ error: 'Session has ended' });
  }

  // Check if time limit exceeded
  const elapsedSeconds = (Date.now() - session.startTime) / 1000;
  if (elapsedSeconds >= 120) {
    conversationManager.endSession(sessionId);
    return res.json({
      sessionId,
      botMessage: "Time's up! Thanks for sharing. 🎉",
      isEnded: true,
      elapsedTime: elapsedSeconds
    });
  }

  let botMessage = null;
  let isEnded = false;

  // Try to get response from Groq API first
  if (groqClient.isAvailable) {
    try {
      // Prepare conversation history for context
      const history = session.messages.map(msg => [
        { role: 'user', content: msg.user },
        { role: 'assistant', content: msg.bot }
      ]).flat();

      botMessage = await groqClient.generateResponse(message, history);
    } catch (error) {
      console.error('Groq generation error:', error.message);
    }
  }

  // Fallback to keyword matching if Groq fails or unavailable
  if (!botMessage) {
    const keywordResponse = getKeywordResponse(message.toLowerCase());
    botMessage = keywordResponse.response;
    isEnded = keywordResponse.shouldEnd;
  }

  // Add to conversation history
  conversationManager.addMessage(sessionId, {
    user: message,
    bot: botMessage,
    timestamp: new Date().toISOString()
  });

  // Check for "no support" pattern to end conversation
  if (!isEnded && message.toLowerCase().match(/\b(no one|nobody|no support)\b/)) {
    isEnded = true;
    botMessage = "Time's up! Thanks for sharing. 🎉";
  }

  if (isEnded) {
    conversationManager.endSession(sessionId);
  }

  res.json({
    sessionId,
    botMessage,
    isEnded,
    elapsedTime: elapsedSeconds,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /session/:sessionId
 * Get session details and conversation history
 */
app.get('/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = conversationManager.getSession(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const elapsedSeconds = (Date.now() - session.startTime) / 1000;

  res.json({
    sessionId,
    isActive: session.isActive,
    elapsedTime: elapsedSeconds,
    timeLimit: 120,
    conversationHistory: session.messages,
    startTime: new Date(session.startTime).toISOString()
  });
});

/**
 * DELETE /session/:sessionId
 * Force end a session
 */
app.delete('/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = conversationManager.getSession(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  conversationManager.endSession(sessionId);
  res.json({ message: 'Session ended', sessionId });
});

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * GET /checkhealth
 * Detailed health check endpoint with system info
 */
app.get('/checkhealth', (req, res) => {
  const stats = conversationManager.getStats();
  const uptime = process.uptime();
  const memUsage = process.memoryUsage();

  res.json({
    status: 'healthy',
    server: {
      nodeVersion: process.version,
      platform: process.platform,
      uptime: `${Math.floor(uptime)}s`,
      environment: process.env.NODE_ENV || 'development'
    },
    memory: {
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`
    },
    sessions: {
      total: stats.totalSessions,
      active: stats.activeSessions,
      inactive: stats.inactiveSessions,
      totalMessages: stats.totalMessages
    },
    timestamp: new Date().toISOString()
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🤖 Study Buddy Bot Backend running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
