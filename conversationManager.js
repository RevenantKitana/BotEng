/**
 * Conversation Manager - Handles session state and conversation history
 * Stores temporary sessions in memory (suitable for development/small scale)
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
   * @returns {string} - Session ID
   */
  createSession() {
    const sessionId = this.generateSessionId();
    this.sessions.set(sessionId, {
      sessionId,
      startTime: Date.now(),
      isActive: true,
      messages: []
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

module.exports = {
  ConversationManager
};
