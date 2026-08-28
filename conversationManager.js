/**
 * Conversation Manager - Handles session state and conversation history
 * Stores temporary sessions in memory (suitable for development/small scale)
 * 
 * Includes:
 * - ConversationManager: Basic session & message management
 * - BotStateManager: Advanced state management for rule-based bot
 */

class ConversationManager {
  constructor() {
    this.sessions = new Map();
    this.sessionTimeout = 15 * 60 * 1000; // 15 minutes session timeout
    this.cleanupInterval = 5 * 60 * 1000; // Cleanup every 5 minutes
    
    // Start periodic cleanup
    this.startCleanup();
  }

  /**
   * Create a new conversation session
   * @param {object} options - Optional session configuration
   * @returns {string} - Session ID
   */
  createSession(options = {}) {
    const sessionId = this.generateSessionId();
    this.sessions.set(sessionId, {
      sessionId,
      startTime: Date.now(),
      isActive: true,
      messages: [],
      state: options.state || null, // Advanced state management
      config: options.config || null // Bot configuration
    });
    
    console.log(`✅ Session created: ${sessionId}`);
    return sessionId;
  }

  /**
   * Get session by ID
   * @param {string} sessionId - Session ID
   * @returns {object|null} - Session object or null if not found
   */
  getSession(sessionId) {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Add message to conversation history
   * @param {string} sessionId - Session ID
   * @param {object} message - { user: string, bot: string, timestamp: string }
   */
  addMessage(sessionId, message) {
    const session = this.getSession(sessionId);
    if (session) {
      session.messages.push(message);
    }
  }

  /**
   * End a session
   * @param {string} sessionId - Session ID
   */
  endSession(sessionId) {
    const session = this.getSession(sessionId);
    if (session) {
      session.isActive = false;
      console.log(`⏹️  Session ended: ${sessionId} (${session.messages.length} messages)`);
    }
  }

  /**
   * Generate unique session ID
   * @returns {string} - Unique session ID
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions() {
    const now = Date.now();
    let deletedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.startTime > this.sessionTimeout) {
        this.sessions.delete(sessionId);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      console.log(`🧹 Cleaned up ${deletedCount} expired sessions`);
    }
  }

  /**
   * Start periodic cleanup of expired sessions
   */
  startCleanup() {
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.cleanupInterval);
  }

  /**
   * Get stats about active sessions
   * @returns {object} - Stats object
   */
  getStats() {
    const sessions = Array.from(this.sessions.values());
    const activeSessions = sessions.filter(s => s.isActive);
    
    return {
      totalSessions: sessions.length,
      activeSessions: activeSessions.length,
      inactiveSessions: sessions.length - activeSessions.length,
      totalMessages: sessions.reduce((sum, s) => sum + s.messages.length, 0)
    };
  }
}

/**
 * Bot State Manager - Advanced state management for rule-based conversational bot
 * Manages:
 * - Checklist state (which items are complete/missing)
 * - Conversation turn counter
 * - Timer tracking
 * - Question/strategy history
 * - Retry/redirect counters
 */
class BotStateManager {
  constructor(config) {
    this.config = config;
    this.state = this._initializeState();
  }

  /**
   * Initialize the state object
   */
  _initializeState() {
    const checklist = this._initializeChecklist();
    
    return {
      mode: 'CORE',
      turn: 0,
      timerStart: Date.now(),
      timerRemaining: this.config.TIMER?.duration || 120,
      
      checklist: checklist,
      currentTarget: this._getFirstMissingTarget(checklist),
      
      history: {
        questions: [],
        responseStyles: [],
        targets: [],
        inputs: []
      },
      
      redirectCount: 0,
      clarifyCount: 0,
      noSupportDetected: false,
      
      metadata: {
        createdAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Initialize checklist from config
   */
  _initializeChecklist() {
    const checklist = this.config.CHECKLIST || {};
    const initialized = {};
    
    for (const [key, item] of Object.entries(checklist)) {
      initialized[key] = {
        value: null,
        status: 'missing',
        priority: item.priority || 50,
        required: item.required || false,
        description: item.description || ''
      };
    }
    
    return initialized;
  }

  /**
   * Get first missing required target
   */
  _getFirstMissingTarget(checklist) {
    const coreRequired = this.config.COMPLETION?.core_required || [];
    
    // First priority: required items
    for (const target of coreRequired) {
      if (checklist[target]?.status === 'missing') {
        return target;
      }
    }
    
    // Second priority: items by priority order
    const sorted = Object.entries(checklist)
      .filter(([_, item]) => item.status === 'missing')
      .sort((a, b) => b[1].priority - a[1].priority);
    
    return sorted.length > 0 ? sorted[0][0] : null;
  }

  /**
   * Update timer (call this every second or on message)
   */
  updateTimer() {
    const elapsed = (Date.now() - this.state.timerStart) / 1000;
    const duration = this.config.TIMER?.duration || 120;
    this.state.timerRemaining = Math.max(0, duration - elapsed);
    return this.state.timerRemaining;
  }

  /**
   * Check if timer is expired
   */
  isTimerExpired() {
    return this.updateTimer() <= 0;
  }

  /**
   * Check if time is running out (near closing_threshold)
   */
  isClosingThreshold() {
    const threshold = this.config.TIMER?.closing_threshold || 15;
    return this.updateTimer() <= threshold;
  }

  /**
   * Update checklist with new information
   * @param {string} target - Checklist item to update
   * @param {string} value - The value extracted from student input
   * @param {boolean} complete - Whether this item is now complete
   */
  updateChecklist(target, value, complete = false) {
    if (this.state.checklist[target]) {
      this.state.checklist[target].value = value;
      if (complete) {
        this.state.checklist[target].status = 'complete';
      }
      this.state.metadata.lastUpdatedAt = new Date().toISOString();
    }
  }

  /**
   * Record question asked
   */
  recordQuestion(target, question) {
    this.state.history.questions.push({
      turn: this.state.turn,
      target,
      question,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Record response style used
   */
  recordResponseStyle(style) {
    this.state.history.responseStyles.push({
      turn: this.state.turn,
      style,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Record target focused on
   */
  recordTarget(target) {
    this.state.history.targets.push({
      turn: this.state.turn,
      target,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Record student input
   */
  recordInput(input) {
    this.state.history.inputs.push({
      turn: this.state.turn,
      input,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Increment turn counter
   */
  nextTurn() {
    this.state.turn += 1;
    this.state.metadata.lastUpdatedAt = new Date().toISOString();
  }

  /**
   * Get missing checklist items (for question selection)
   */
  getMissingItems() {
    return Object.entries(this.state.checklist)
      .filter(([_, item]) => item.status === 'missing')
      .sort((a, b) => b[1].priority - a[1].priority)
      .map(([key]) => key);
  }

  /**
   * Get core required items that are still missing
   */
  getMissingCoreItems() {
    const coreRequired = this.config.COMPLETION?.core_required || [];
    return coreRequired.filter(
      (item) => this.state.checklist[item]?.status === 'missing'
    );
  }

  /**
   * Check if core requirements are met
   */
  isCoreComplete() {
    const coreRequired = this.config.COMPLETION?.core_required || [];
    return coreRequired.every(
      (item) => this.state.checklist[item]?.status === 'complete'
    );
  }

  /**
   * Check if all optional items have been explored
   */
  isExploreComplete() {
    const optionalTargets = this.config.COMPLETION?.optional_targets || [];
    const maxQuestions = this.config.EXPLORE?.max_optional_questions || 3;
    return this.state.history.targets.filter(
      (t) => optionalTargets.includes(t.target)
    ).length >= maxQuestions;
  }

  /**
   * Get recent questions to avoid repetition
   */
  getRecentQuestions(count = null) {
    const memory = count || this.config.RANDOM?.recent_question_memory || 4;
    return this.state.history.questions
      .slice(-memory)
      .map((q) => q.question);
  }

  /**
   * Get recent response styles
   */
  getRecentStyles(count = null) {
    const memory = count || this.config.RANDOM?.recent_strategy_memory || 2;
    return this.state.history.responseStyles
      .slice(-memory)
      .map((s) => s.style);
  }

  /**
   * Increment redirect counter
   */
  addRedirect() {
    this.state.redirectCount += 1;
  }

  /**
   * Increment clarification counter
   */
  addClarify() {
    this.state.clarifyCount += 1;
  }

  /**
   * Check if max redirects exceeded
   */
  maxRedirectsExceeded() {
    const maxRedirect = this.config.RETRY?.max_redirect || 2;
    return this.state.redirectCount >= maxRedirect;
  }

  /**
   * Check if max clarifications exceeded
   */
  maxClarifiesExceeded() {
    const maxClarify = this.config.RETRY?.max_clarify || 1;
    return this.state.clarifyCount >= maxClarify;
  }

  /**
   * Set no-support flag
   */
  setNoSupport() {
    this.state.noSupportDetected = true;
    this.state.mode = 'NO_SUPPORT';
  }

  /**
   * Change mode
   */
  changeMode(newMode) {
    this.state.mode = newMode;
    this.state.metadata.lastUpdatedAt = new Date().toISOString();
  }

  /**
   * Get current state
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Reset for new conversation (useful for testing)
   */
  reset() {
    this.state = this._initializeState();
  }
}

module.exports = {
  ConversationManager,
  BotStateManager
};
