/**
 * Bot Analyzer Module
 * 
 * Handles:
 * 1. Analyzing student input using GPT (structured JSON)
 * 2. Generating natural responses using GPT
 * 3. Validating GPT output against rules
 * 4. Fallback to template-based responses
 */

const axios = require('axios');

class BotAnalyzer {
  constructor(config, groqClient) {
    this.config = config;
    this.groqClient = groqClient;
  }

  /**
   * Analyze student input and extract information
   * Returns structured JSON with classification and extracted info
   * 
   * @param {object} state - Current bot state
   * @param {string} studentInput - Student's message
   * @returns {object} - Analysis result with classification, confidence, information
   */
  async analyzeInput(state, studentInput) {
    try {
      // Build analysis prompt
      const prompt = this._buildAnalysisPrompt(state, studentInput);
      
      // Call Groq API (fallback if method not available)
      let response;
      if (this.groqClient && typeof this.groqClient.generateResponse === 'function') {
        response = await this.groqClient.generateResponse(prompt, []);
      } else if (this.groqClient && typeof this.groqClient.sendMessage === 'function') {
        response = await this.groqClient.sendMessage(prompt);
      } else {
        // Fallback: use deterministic classification without GPT
        return this._getFallbackAnalysis(studentInput, state);
      }
      
      // Parse JSON response
      let analysis = this._parseJsonResponse(response);
      
      // Validate against schema
      analysis = this._validateAnalysis(analysis);
      
      return {
        success: true,
        analysis,
        raw: response
      };
    } catch (error) {
      console.error('❌ Analysis error:', error.message);
      // Fall back to deterministic analysis
      return this._getFallbackAnalysis(studentInput, state);
    }
  }

  /**
   * Fallback analysis using keyword-based classification
   */
  _getFallbackAnalysis(studentInput, state) {
    const lowerInput = studentInput.toLowerCase();
    
    // Determine classification based on keywords
    let classification = 'UNCLEAR';
    
    if (lowerInput.includes('no') || lowerInput.includes('nobody') || lowerInput.includes('none')) {
      classification = 'NO_SUPPORT';
    } else if (lowerInput.includes('parent') || lowerInput.includes('mother') || 
               lowerInput.includes('father') || lowerInput.includes('family') ||
               lowerInput.includes('brother') || lowerInput.includes('sister') ||
               lowerInput.includes('grandmother') || lowerInput.includes('grandfather')) {
      classification = 'DIRECT';
    } else if (lowerInput.length < 5) {
      classification = 'UNCLEAR';
    } else {
      classification = 'RELEVANT';
    }
    
    return {
      success: true,
      analysis: {
        classification,
        confidence: 0.6,
        extracted_information: {},
        reasoning: 'Fallback keyword-based analysis'
      },
      raw: 'Fallback analysis'
    };
  }

  /**
   * Build analysis prompt for GPT
   */
  _buildAnalysisPrompt(state, studentInput) {
    const currentTarget = state.currentTarget || 'supporter';
    const checklist = state.checklist;
    
    const gptRules = this.config.GPT_RULES || '';
    const schema = this.config.GPT_ANALYSIS_OUTPUT?.schema;
    
    return `
SYSTEM PROMPT:
You are the analysis module of a conservative Grade 10 English learning chatbot.

Follow these rules strictly:
${gptRules}

Your task is ONLY to analyze the student's latest message.
Do not generate a conversational response.
Do not invent information.
Do not infer information that is not reasonably supported by the student's words.

Return ONLY valid JSON. No other text.

---

CURRENT TARGET: ${currentTarget}

CHECKLIST STATE:
${Object.entries(checklist)
  .map(([key, item]) => `- ${key}: ${item.status} (value: ${item.value || 'none'})`)
  .join('\n')}

STUDENT MESSAGE:
"${studentInput}"

---

RESPONSE (JSON ONLY):
{
  "classification": "DIRECT|RELEVANT|PARTIAL|UNCLEAR|OFF_TOPIC",
  "confidence": 0.0,
  "information": {
    "supporter": null,
    "action": null,
    "situation": null,
    "feeling": null,
    "example": null,
    "reason": null
  },
  "current_target_answered": false,
  "useful_information": false
}
`;
  }

  /**
   * Generate natural response using GPT
   * 
   * @param {object} state - Current bot state
   * @param {string} responseStyle - Style of response (acknowledge, reflection, curiosity)
   * @returns {object} - Generated response message
   */
  async generateResponse(state, responseStyle = 'direct_question') {
    try {
      const prompt = this._buildResponsePrompt(state, responseStyle);
      
      // Call Groq API (with fallback)
      let response;
      if (this.groqClient && typeof this.groqClient.generateResponse === 'function') {
        response = await this.groqClient.generateResponse(prompt, []);
      } else if (this.groqClient && typeof this.groqClient.sendMessage === 'function') {
        response = await this.groqClient.sendMessage(prompt);
      } else {
        return this._getFallbackResponse(state, responseStyle);
      }
      
      let result = this._parseJsonResponse(response);
      
      // Validate response
      result = this._validateResponse(result, state);
      
      return {
        success: true,
        message: result.message || this.getFallbackResponse(state, responseStyle),
        raw: response
      };
    } catch (error) {
      console.error('❌ Response generation error:', error.message);
      return this._getFallbackResponse(state, responseStyle);
    }
  }

  /**
   * Fallback response when GPT is unavailable
   */
  _getFallbackResponse(state, responseStyle) {
    return {
      success: true,
      message: this.getFallbackResponse(state, responseStyle),
      raw: 'Fallback response'
    };
  }

  /**
   * Build response generation prompt
   */
  _buildResponsePrompt(state, responseStyle) {
    const currentTarget = state.currentTarget || 'supporter';
    const checklist = state.checklist;
    const questions = this.config[`QUESTION:${currentTarget}`] || [];
    
    // Get student info collected so far
    const studentInfo = Object.entries(checklist)
      .filter(([_, item]) => item.value !== null)
      .map(([key, item]) => `${key}: ${item.value}`)
      .join('\n');
    
    const gptRules = this.config.GPT_RULES || '';
    
    return `
SYSTEM PROMPT:
You are the response-writing module of a conservative Grade 10 English study buddy.

Write ONE short natural response.

Follow these rules:
${gptRules}

Rules:
- Stay within the lesson topic (family support)
- Use only supplied student information
- Acknowledge the student's answer naturally
- Ask at most ONE question
- Ask only about the target: ${currentTarget}
- Never introduce a new topic
- Never invent information
- Use Grade 10 appropriate English
- Keep response SHORT (1-2 sentences max)

TARGET: ${currentTarget}

RESPONSE STYLE: ${responseStyle}

STUDENT INFORMATION COLLECTED:
${studentInfo || '(no information yet)'}

ALLOWED QUESTION OPTIONS FOR THIS TARGET:
${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

---

Return ONLY valid JSON:
{
  "message": "One natural response here with at most ONE question"
}
`;
  }

  /**
   * Parse JSON from response
   */
  _parseJsonResponse(response) {
    try {
      // Handle null or empty response
      if (!response || typeof response !== 'string') {
        return null;
      }
      
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      // If no JSON found, return error
      return null;
    } catch (error) {
      console.error('❌ JSON parse error:', error.message);
      return null;
    }
  }

  /**
   * Validate analysis against schema
   */
  _validateAnalysis(analysis) {
    if (!analysis) {
      return {
        classification: 'UNCLEAR',
        confidence: 0,
        information: {
          supporter: null,
          action: null,
          situation: null,
          feeling: null,
          example: null,
          reason: null
        },
        current_target_answered: false,
        useful_information: false
      };
    }

    // Validate classification
    const allowed = ['DIRECT', 'RELEVANT', 'PARTIAL', 'UNCLEAR', 'OFF_TOPIC'];
    if (!allowed.includes(analysis.classification)) {
      analysis.classification = 'UNCLEAR';
    }

    // Validate confidence (0-1)
    if (typeof analysis.confidence !== 'number') {
      analysis.confidence = 0;
    }
    analysis.confidence = Math.max(0, Math.min(1, analysis.confidence));

    // Ensure information object
    if (!analysis.information) {
      analysis.information = {};
    }

    // Ensure boolean fields
    analysis.current_target_answered =
      analysis.current_target_answered === true;
    analysis.useful_information = analysis.useful_information === true;

    return analysis;
  }

  /**
   * Validate response against rules
   */
  _validateResponse(response, state) {
    if (!response || !response.message) {
      return { message: '' };
    }

    const message = response.message.trim();

    // Check message length (max 300 characters for short response)
    if (message.length > 300) {
      return { message: message.substring(0, 297) + '...' };
    }

    // Check for forbidden topics
    const forbidden = this.config.TOPIC_BOUNDARY?.forbidden || [];
    const forbiddenRegex = new RegExp(
      `\\b(${forbidden.join('|')})\\b`,
      'gi'
    );
    if (forbiddenRegex.test(message)) {
      console.warn('⚠️  Response contains forbidden topic');
      return { message: '' };
    }

    // Check for multiple questions
    const questionCount = (message.match(/\?/g) || []).length;
    if (questionCount > 1) {
      console.warn('⚠️  Response contains multiple questions');
      return { message: '' };
    }

    // Check for repeated questions
    const recentQuestions = state.history?.questions || [];
    const lastQuestion = recentQuestions[recentQuestions.length - 1];
    if (
      lastQuestion &&
      message.toLowerCase().includes(lastQuestion.question.toLowerCase())
    ) {
      console.warn('⚠️  Response repeats recent question');
      return { message: '' };
    }

    return { message };
  }

  /**
   * Get fallback template response
   */
  getFallbackResponse(state, classification) {
    const responses = {
      DIRECT: 'That makes sense.',
      RELEVANT: 'I see.',
      PARTIAL: 'Could you tell me a little more?',
      UNCLEAR: 'I\'m not quite sure what you mean. Could you explain?',
      OFF_TOPIC: 'Let\'s stay with the topic of family support.'
    };

    return responses[classification] || 'Thank you for sharing.';
  }
}

module.exports = BotAnalyzer;
