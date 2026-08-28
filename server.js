require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { getKeywordResponse } = require('./keywords');
const { ConversationManager, BotStateManager } = require('./conversationManager');
const { GroqClient } = require('./groqClient');
const BotConfigParser = require('./botConfigParser');
const BotEngine = require('./botEngine');
const BotAnalyzer = require('./botAnalyzer');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb', strict: true }));

// Request logging and validation middleware
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('❌ JSON parse error:', {
      message: err.message,
      body: req.body || 'undefined',
      contentType: req.headers['content-type']
    });
    return res.status(400).json({ 
      error: 'Invalid JSON in request body. Ensure your request is valid JSON.',
      details: err.message 
    });
  }
  next(err);
});

// Initialize clients
const conversationManager = new ConversationManager();
const groqClient = new GroqClient();

// Log startup info
console.log('🚀 Bot Engine starting up...');
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('Groq API available:', !!process.env.GROQ_API_KEY);

// Load bot configuration
const configPath = path.join(__dirname, 'Unit1_Discussion_Bot.txt');
const configParser = new BotConfigParser(configPath);
const parseResult = configParser.parse();

if (!parseResult.success) {
  console.error('❌ Config parse errors:', parseResult.errors);
  process.exit(1);
}

const botConfig = parseResult.config;
console.log('✅ Bot configuration loaded successfully');

// Initialize bot engine and analyzer
const botEngine = new BotEngine(botConfig);
const botAnalyzer = new BotAnalyzer(botConfig, groqClient);

// Routes

/**
 * POST /start
 * Start a new conversation session with rule-based bot state
 */
app.post('/start', (req, res) => {
  // Initialize state manager
  const stateManager = new BotStateManager(botConfig);
  
  const sessionId = conversationManager.createSession({
    state: stateManager.getState(),
    config: botConfig
  });
  
  const opening = botConfig.OPENING || {};
  const timer = botConfig.TIMER || {};
  
  res.json({
    sessionId,
    message: opening.message || 'Who in your family supports you most?',
    instruction: opening.instruction || 'Chat with your study buddy.',
    timeLimit: timer.duration || 120, // 2 minutes in seconds
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /chat
 * Send a message and get bot response
 * Body: { sessionId, message }
 * Uses rule-based bot engine with GPT analysis
 */
app.post('/chat', async (req, res) => {
  const { sessionId, message } = req.body;

  // Validation
  if (!sessionId) {
    return res.status(400).json({ error: 'Missing sessionId' });
  }

  if (!message || message.trim() === '') {
    const emptyMsg = botConfig.EMPTY?.message || 'Type an answer first.';
    return res.status(400).json({ error: emptyMsg });
  }

  // Check if session exists and is still active
  const session = conversationManager.getSession(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  if (!session.isActive) {
    return res.status(400).json({ error: 'Session has ended' });
  }

  // Get or recreate state
  let state = session.state;
  if (!state) {
    state = new BotStateManager(botConfig).getState();
    session.state = state;
  }

  // Update timer
  const stateManager = new BotStateManager(botConfig);
  stateManager.state = state;
  const timeRemaining = stateManager.updateTimer();

  // Check if time limit exceeded
  if (timeRemaining <= 0) {
    conversationManager.endSession(sessionId);
    const timeoutMsg = botConfig.TIMER?.timeout_message || "Time's up! Thanks for sharing.";
    return res.json({
      sessionId,
      botMessage: timeoutMsg,
      isEnded: true,
      timeRemaining: 0,
      elapsedTime: botConfig.TIMER?.duration || 120
    });
  }

  // Check if closing threshold reached
  const isClosing = timeRemaining <= (botConfig.TIMER?.closing_threshold || 15);

  let botMessage = '';
  let isEnded = false;
  let analysisResult = null;
  let engineDecision = null;

  try {
    // Step 1: Analyze student input using GPT
    console.log(`📝 Analyzing: "${message}"`);
    analysisResult = await botAnalyzer.analyzeInput(state, message);

    if (analysisResult.success && analysisResult.analysis) {
      console.log(`✅ Classification: ${analysisResult.analysis.classification}`);

      // Step 2: Engine makes decision based on analysis
      engineDecision = botEngine.processAnalysis(
        state,
        analysisResult.analysis,
        message
      );

      console.log(`⚙️  Action: ${engineDecision.action}`);

      // Step 3: Update state based on decision
      state.turn += 1;
      stateManager.state = state;

      // Record input
      stateManager.recordInput(message);

      // Update checklist if needed
      if (engineDecision.updateChecklist) {
        const { target, value, complete } = engineDecision.updateChecklist;
        stateManager.updateChecklist(target, value, complete);
        stateManager.recordTarget(target);
      }

      // Handle redirect/clarify
      if (engineDecision.redirect) {
        stateManager.addRedirect();
        botMessage = engineDecision.redirectMessage;
      } else if (engineDecision.clarify) {
        stateManager.addClarify();
        botMessage = engineDecision.clarifyMessage ||
          botAnalyzer.getFallbackResponse(
            state,
            analysisResult.analysis.classification
          );
      } else {
        // Generate natural response
        const nextTarget = engineDecision.nextTarget;
        const responseStyle = botEngine.selectResponseStyle(state);

        if (nextTarget && !isClosing) {
          // Select question
          const question = botEngine.selectQuestion(state, nextTarget);
          stateManager.recordQuestion(nextTarget, question);
          stateManager.recordResponseStyle(responseStyle);

          // Try to generate natural response
          const genResult = await botAnalyzer.generateResponse(state, responseStyle);

          if (genResult.success && genResult.message) {
            botMessage = genResult.message;
          } else {
            // Fallback to template
            botMessage = botAnalyzer.getFallbackResponse(
              state,
              analysisResult.analysis.classification
            );
          }
        } else if (isClosing && !isEnded) {
          // Closing message
          botMessage = botConfig.TIMER?.closing_message ||
            'We are almost out of time. Thanks for sharing!';
        } else {
          // No more targets
          botMessage = 'Thanks for sharing! Great conversation.';
          isEnded = true;
        }
      }

      // Check if should end session
      if (engineDecision.endSession || engineDecision.action === 'NO_SUPPORT') {
        isEnded = true;
      }

      if (botEngine.shouldClose(state)) {
        isEnded = true;
      }
    } else {
      // Analysis failed, use fallback
      console.warn('⚠️  Analysis failed, using fallback');
      botMessage = 'That sounds interesting. Can you tell me more?';
    }
  } catch (error) {
    console.error('❌ Chat processing error:', error.message);
    botMessage = 'Sorry, I had trouble understanding. Could you try again?';
  }

  // Add to conversation history
  conversationManager.addMessage(sessionId, {
    user: message,
    bot: botMessage,
    timestamp: new Date().toISOString(),
    analysis: analysisResult?.analysis || null,
    engineDecision: engineDecision || null
  });

  if (isEnded) {
    conversationManager.endSession(sessionId);
  }

  // Update session state
  session.state = state;

  res.json({
    sessionId,
    botMessage,
    isEnded,
    timeRemaining,
    currentTarget: state.currentTarget,
    checklist: state.checklist,
    turn: state.turn,
    classification: analysisResult?.analysis?.classification || null,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /session/:sessionId
 * Get session details, state, and conversation history
 */
app.get('/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = conversationManager.getSession(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const elapsedSeconds = (Date.now() - session.startTime) / 1000;
  const timeLimit = botConfig.TIMER?.duration || 120;
  const timeRemaining = Math.max(0, timeLimit - elapsedSeconds);

  res.json({
    sessionId,
    isActive: session.isActive,
    elapsedTime: elapsedSeconds,
    timeRemaining,
    timeLimit,
    state: session.state || null,
    conversationHistory: session.messages.map(msg => ({
      user: msg.user,
      bot: msg.bot,
      timestamp: msg.timestamp,
      classification: msg.analysis?.classification || null
    })),
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
