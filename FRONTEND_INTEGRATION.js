// Frontend Integration Example
// Use this in your React/Vue/vanilla JS frontend

class StudyBuddyBotClient {
  constructor(apiUrl = 'http://localhost:3000') {
    this.apiUrl = apiUrl;
    this.sessionId = null;
    this.isActive = true;
    this.timeLimit = 120; // 2 minutes
    this.elapsedTime = 0;
    this.conversationHistory = [];
  }

  /**
   * Start a new conversation session
   * @returns {Promise<object>} - { sessionId, message, timeLimit, timestamp }
   */
  async startSession() {
    try {
      const response = await fetch(`${this.apiUrl}/start`, {
        method: 'POST'
      });
      const data = await response.json();
      
      this.sessionId = data.sessionId;
      this.isActive = true;
      this.timeLimit = data.timeLimit;
      this.elapsedTime = 0;
      this.conversationHistory = [];
      
      return data;
    } catch (error) {
      console.error('Failed to start session:', error);
      throw error;
    }
  }

  /**
   * Send a message and get bot response
   * @param {string} message - User's message
   * @returns {Promise<object>} - { botMessage, isEnded, elapsedTime, etc. }
   */
  async sendMessage(message) {
    if (!this.sessionId) {
      throw new Error('No active session. Call startSession() first.');
    }

    if (!message || message.trim() === '') {
      throw new Error('Type an answer first');
    }

    try {
      const response = await fetch(`${this.apiUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          message
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      const data = await response.json();
      
      // Update local state
      this.elapsedTime = data.elapsedTime;
      this.isActive = !data.isEnded;
      
      // Add to history
      this.conversationHistory.push({
        userMessage: message,
        botMessage: data.botMessage
      });

      return data;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Get full session details
   * @returns {Promise<object>} - Full session data
   */
  async getSessionDetails() {
    if (!this.sessionId) {
      throw new Error('No active session.');
    }

    try {
      const response = await fetch(`${this.apiUrl}/session/${this.sessionId}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to get session details:', error);
      throw error;
    }
  }

  /**
   * End session prematurely
   * @returns {Promise<object>} - Confirmation
   */
  async endSession() {
    if (!this.sessionId) {
      throw new Error('No active session.');
    }

    try {
      const response = await fetch(`${this.apiUrl}/session/${this.sessionId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      
      this.isActive = false;
      return data;
    } catch (error) {
      console.error('Failed to end session:', error);
      throw error;
    }
  }

  /**
   * Get formatted elapsed time (MM:SS)
   * @returns {string} - Formatted time
   */
  getFormattedTime() {
    const minutes = Math.floor(this.elapsedTime / 60);
    const seconds = Math.floor(this.elapsedTime % 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  /**
   * Get remaining time for session
   * @returns {number} - Remaining seconds
   */
  getRemainingTime() {
    return Math.max(0, this.timeLimit - Math.floor(this.elapsedTime));
  }
}

// ============================================
// USAGE EXAMPLES
// ============================================

// Example 1: Basic Chat Flow
async function basicChatExample() {
  const bot = new StudyBuddyBotClient('http://localhost:3000');

  try {
    // Start conversation
    const start = await bot.startSession();
    console.log('Bot:', start.message);

    // Send first message
    const res1 = await bot.sendMessage('My mom helps me');
    console.log('Bot:', res1.botMessage);

    // Send follow-up
    const res2 = await bot.sendMessage('She listens to my problems');
    console.log('Bot:', res2.botMessage);
    console.log(`Elapsed: ${bot.getFormattedTime()} / Time limit: ${bot.timeLimit}s`);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Example 2: React Component
/*
import React, { useState, useEffect } from 'react';

export function ChatBot() {
  const [bot] = useState(() => new StudyBuddyBotClient());
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isStarted, setIsStarted] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(120);

  useEffect(() => {
    if (!isStarted || isEnded) return;

    const interval = setInterval(() => {
      setTimeRemaining(bot.getRemainingTime());
    }, 100);

    return () => clearInterval(interval);
  }, [isStarted, isEnded, bot]);

  async function handleStart() {
    try {
      const start = await bot.startSession();
      setMessages([
        { type: 'bot', text: start.message }
      ]);
      setIsStarted(true);
      setTimeRemaining(bot.timeLimit);
    } catch (error) {
      alert('Error: ' + error.message);
    }
  }

  async function handleSendMessage() {
    if (!input.trim()) {
      alert('Type an answer first');
      return;
    }

    try {
      const response = await bot.sendMessage(input);
      
      setMessages(prev => [
        ...prev,
        { type: 'user', text: input },
        { type: 'bot', text: response.botMessage }
      ]);
      
      setInput('');
      setTimeRemaining(bot.getRemainingTime());

      if (response.isEnded) {
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
        <h1>Study Buddy Bot</h1>
        <button onClick={handleStart}>Start chatting →</button>
      </div>
    );
  }

  if (isEnded) {
    return (
      <div className="chat-end">
        <h2>Chat Ended</h2>
        <button onClick={() => window.location.reload()}>Continue →</button>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="timer">
        ⏱️ {formatTime(timeRemaining)}
      </div>
      
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.type}`}>
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
        />
        <button onClick={handleSendMessage}>Send</button>
      </div>
    </div>
  );
}
*/

// Example 3: Vue Component
/*
<template>
  <div v-if="!isStarted" class="chat-start">
    <h1>Study Buddy Bot</h1>
    <button @click="handleStart">Start chatting →</button>
  </div>

  <div v-else-if="isEnded" class="chat-end">
    <h2>Chat Ended</h2>
    <button @click="handleContinue">Continue →</button>
  </div>

  <div v-else class="chat-container">
    <div class="timer">
      ⏱️ {{ formatTime(timeRemaining) }}
    </div>

    <div class="messages">
      <div v-for="(msg, i) in messages" :key="i" :class="['message', msg.type]">
        {{ msg.text }}
      </div>
    </div>

    <div class="input-area">
      <input
        v-model="input"
        type="text"
        placeholder="Type your answer..."
        @keyup.enter="handleSendMessage"
      />
      <button @click="handleSendMessage">Send</button>
    </div>
  </div>
</template>

<script>
import { StudyBuddyBotClient } from './bot-client.js';

export default {
  data() {
    return {
      bot: new StudyBuddyBotClient(),
      isStarted: false,
      isEnded: false,
      input: '',
      messages: [],
      timeRemaining: 120
    };
  },
  
  methods: {
    async handleStart() {
      const start = await this.bot.startSession();
      this.messages = [{ type: 'bot', text: start.message }];
      this.isStarted = true;
      this.timeRemaining = this.bot.timeLimit;
    },

    async handleSendMessage() {
      if (!this.input.trim()) {
        alert('Type an answer first');
        return;
      }

      const response = await this.bot.sendMessage(this.input);
      this.messages.push(
        { type: 'user', text: this.input },
        { type: 'bot', text: response.botMessage }
      );
      this.input = '';
      this.timeRemaining = this.bot.getRemainingTime();

      if (response.isEnded) {
        this.isEnded = true;
      }
    },

    formatTime(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
  }
};
</script>
*/

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StudyBuddyBotClient;
}
