/**
 * Groq API Integration for generative responses
 * Provides AI-powered conversational responses with family context
 */

const axios = require('axios');

class GroqClient {
  constructor(apiKey = process.env.GROQ_API_KEY) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.groq.com/openai/v1';
    this.model = 'mixtral-8x7b-32768'; // Free model alternative
    this.isAvailable = !!apiKey;

    if (!this.isAvailable) {
      console.log('⚠️  Groq API key not configured - using fallback responses');
      console.log('   Set GROQ_API_KEY environment variable to enable AI responses');
    } else {
      console.log('✅ Groq API key detected - AI responses enabled');
    }
  }

  /**
   * Generate a response using Groq API
   * @param {string} userMessage - User's message
   * @param {array} conversationHistory - Previous messages for context
   * @returns {Promise<string>} - Generated response
   */
  async generateResponse(userMessage, conversationHistory = []) {
    if (!this.isAvailable) {
      return null;
    }

    try {
      if (!this.apiKey) {
        console.warn('⚠️  Groq API key is not set. Ensure GROQ_API_KEY is configured in .env');
        return null;
      }

      const systemPrompt = `You are a friendly and encouraging study buddy chatbot helping students practice English by discussing family members who support them. 

Your role:
- Ask follow-up questions about how family members support them
- Show genuine interest and encouragement
- Keep responses warm, conversational, and age-appropriate
- Gently redirect if they mention non-family topics back to family
- Be empathetic and supportive

Important: Keep responses concise (1-2 sentences), conversational, and natural.`;

      const messages = [
        {
          role: 'system',
          content: systemPrompt
        },
        ...conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        {
          role: 'user',
          content: userMessage
        }
      ];

      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: this.model,
          messages,
          temperature: 0.7,
          max_tokens: 150,
          top_p: 0.9
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10 second timeout
        }
      );

      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Groq API error:', error.message);
      if (error.response) {
        console.error('  Status:', error.response.status);
        console.error('  Data:', JSON.stringify(error.response.data, null, 2));
      }
      console.warn('⚠️  Falling back to keyword-based response (Groq API unavailable)');
      return null;
    }
  }

  /**
   * Check if Groq API is available and working
   * @returns {Promise<boolean>}
   */
  async checkAvailability() {
    if (!this.isAvailable) {
      return false;
    }

    try {
      await axios.get(`${this.baseURL}/models`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`
        },
        timeout: 5000
      });
      return true;
    } catch (error) {
      console.error('Groq API unavailable:', error.message);
      return false;
    }
  }
}

module.exports = { GroqClient };
