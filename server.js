require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { getKeywordResponse } = require('./keywords');
const { ConversationManager } = require('./conversationManager');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Conversation manager instance
const conversationManager = new ConversationManager();

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
app.post('/chat', (req, res) => {
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

  // Get bot response based on keywords
  const botResponse = getKeywordResponse(message.toLowerCase());

  // Add to conversation history
  conversationManager.addMessage(sessionId, {
    user: message,
    bot: botResponse.response,
    timestamp: new Date().toISOString()
  });

  // Check if conversation should end
  const isEnded = botResponse.shouldEnd;
  if (isEnded) {
    conversationManager.endSession(sessionId);
  }

  res.json({
    sessionId,
    botMessage: botResponse.response,
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
