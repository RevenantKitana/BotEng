/**
 * Rule-based Bot Config Parser
 * Parses Unit1_Discussion_Bot.txt and returns a structured config object
 */

const fs = require('fs');
const path = require('path');

class BotConfigParser {
  constructor(configPath) {
    this.configPath = configPath;
    this.config = {};
    this.errors = [];
  }

  /**
   * Parse the config file and return structured config
   */
  parse() {
    try {
      const content = fs.readFileSync(this.configPath, 'utf-8');
      this.config = this._parseContent(content);
      return { success: true, config: this.config, errors: this.errors };
    } catch (error) {
      return {
        success: false,
        config: null,
        errors: [error.message],
      };
    }
  }

  /**
   * Parse the text content into structured sections
   */
  _parseContent(content) {
    const lines = content.split('\n');
    const config = {};
    let currentSection = null;
    let sectionLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('#')) continue;

      // Section header [SECTION_NAME]
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        if (currentSection) {
          config[currentSection] = this._processSection(
            currentSection,
            sectionLines
          );
        }
        currentSection = trimmed.slice(1, -1);
        sectionLines = [];
        continue;
      }

      // Add line to current section
      sectionLines.push(line);
    }

    // Process last section
    if (currentSection) {
      config[currentSection] = this._processSection(currentSection, sectionLines);
    }

    this._validateConfig(config);
    return config;
  }

  /**
   * Process individual section based on type
   */
  _processSection(sectionName, lines) {
    // Different parsing strategies for different section types
    if (sectionName.startsWith('QUESTION:') || sectionName.startsWith('RESPONSE:')) {
      return this._parseSimpleList(lines);
    }

    if (sectionName === 'CHECKLIST') {
      return this._parseChecklistFromLines(lines);
    }

    if (sectionName === 'TOPIC_BOUNDARY') {
      return this._parseTopicBoundaryFromLines(lines);
    }

    // For other sections, use key-value parsing
    const data = this._parseKeyValueLines(lines);

    if (sectionName === 'ACTIVITY') return this._parseActivity(data);
    if (sectionName === 'POLICY') return this._parsePolicy(data);
    if (sectionName === 'OPENING') return this._parseOpening(data);
    if (sectionName === 'STRATEGY') return this._parseStrategy(data);
    if (sectionName === 'CLASSIFICATION') return this._parseClassification(data);
    if (sectionName === 'DECISION') return this._parseDecision(data);
    if (sectionName === 'RETRY') return this._parseRetry(data);
    if (sectionName === 'NO_SUPPORT') return this._parseNoSupport(data);
    if (sectionName === 'EMPTY') return this._parseEmpty(data);
    if (sectionName === 'RANDOM') return this._parseRandom(data);
    if (sectionName === 'COMPLETION') return this._parseCompletion(data);
    if (sectionName === 'EXPLORE') return this._parseExplore(data);
    if (sectionName === 'FREE_CONVERSATION') return this._parseFreeConversation(data);
    if (sectionName === 'TIMER') return this._parseTimer(data);
    if (sectionName === 'END') return this._parseEnd(data);
    if (sectionName === 'GPT_RULES') return this._parseGptRules(data);
    if (sectionName === 'GPT_ANALYSIS_OUTPUT') return this._parseGptAnalysisOutput(data);

    return data;
  }

  /**
   * Parse simple list (for QUESTION and RESPONSE sections)
   */
  _parseSimpleList(lines) {
    return lines
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && !line.startsWith('-'));
  }

  /**
   * Parse key-value lines
   */
  _parseKeyValueLines(lines) {
    const data = {};
    let currentKey = null;
    let currentValue = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      if (trimmed.includes('=')) {
        // Save previous key-value
        if (currentKey) {
          data[currentKey] = currentValue.join('\n');
        }

        // Parse new key-value
        const [key, ...valueParts] = trimmed.split('=');
        currentKey = key.trim();
        currentValue = [valueParts.join('=').trim()];
      } else if (currentKey) {
        // Multi-line value
        currentValue.push(trimmed);
      }
    }

    // Save last key-value
    if (currentKey) {
      data[currentKey] = currentValue.join('\n');
    }

    return data;
  }

  /**
   * Parse checklist from lines
   */
  _parseChecklistFromLines(lines) {
    const checklist = {};
    let currentItem = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const leadingSpaces = line.match(/^\s*/)[0].length;
      const isIndented = leadingSpaces > 0;

      if (!isIndented && !trimmed.includes('=')) {
        // Item name
        if (currentItem) {
          checklist[currentItem.name] = {
            priority: parseInt(currentItem.priority) || 50,
            required: (currentItem.required || 'false') === 'true',
            description: currentItem.description || '',
            value: null,
            status: 'missing'
          };
        }
        currentItem = { name: trimmed, priority: '50', required: 'false' };
      } else if (isIndented && trimmed.includes('=') && currentItem) {
        // Property
        const [key, ...valueParts] = trimmed.split('=');
        currentItem[key.trim()] = valueParts.join('=').trim();
      }
    }

    // Save last item
    if (currentItem) {
      checklist[currentItem.name] = {
        priority: parseInt(currentItem.priority) || 50,
        required: (currentItem.required || 'false') === 'true',
        description: currentItem.description || '',
        value: null,
        status: 'missing'
      };
    }

    return checklist;
  }

  /**
   * Parse topic boundary from lines
   */
  _parseTopicBoundaryFromLines(lines) {
    const result = {
      main_topic: '',
      allowed: [],
      related: [],
      forbidden: []
    };
    let currentList = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      // Check for key = format
      if (trimmed.includes('=')) {
        const [key, value] = trimmed.split('=');
        const cleanKey = key.trim();
        const cleanValue = value.trim();

        if (cleanKey === 'main_topic') {
          result.main_topic = cleanValue;
        } else if (cleanKey === 'allowed' || cleanKey === 'related' || cleanKey === 'forbidden') {
          currentList = cleanKey;
          // If there's a value after =, treat it as first item
          if (cleanValue.startsWith('-')) {
            result[currentList].push(cleanValue.replace(/^-\s*/, ''));
          }
        }
      } else if (trimmed.startsWith('-') && currentList) {
        // List item
        result[currentList].push(trimmed.replace(/^-\s*/, ''));
      } else if (trimmed && !trimmed.startsWith('-') && currentList) {
        // Plain text item (not starting with -)
        // This handles bare text items
        // result[currentList].push(trimmed);
      }
    }

    return result;
  }

  _parseActivity(data) {
    return {
      id: data.id || '',
      title: data.title || '',
      language: data.language || 'English',
      level: data.level || '',
      duration: parseInt(data.duration) || 120,
    };
  }

  _parsePolicy(data) {
    return {
      personality: data.personality || '',
      primary_goal: data.primary_goal || '',
      conversation_style: data.conversation_style || '',
      strictness: data.strictness || 'high',
      never: this._parseList(data.never || ''),
    };
  }

  _parseOpening(data) {
    return {
      instruction: data.instruction || '',
      message: data.message || '',
    };
  }

  _parseChecklist(data) {
    // data is already a parsed checklist object from _parseChecklistFromLines
    return data;
  }

  _parseTopicBoundary(data) {
    // data is already a parsed object from _parseTopicBoundaryFromLines
    return data;
  }

  _parseQuestions(data) {
    // data is already a parsed array from _parseSimpleList
    return Array.isArray(data) ? data : [];
  }

  _parseResponses(data) {
    // data is already a parsed array from _parseSimpleList
    return Array.isArray(data) ? data : [];
  }

  _parseStrategy(data) {
    return {
      acknowledge_question: parseInt(data.acknowledge_question) || 40,
      reflection_question: parseInt(data.reflection_question) || 30,
      direct_question: parseInt(data.direct_question) || 20,
      curiosity_question: parseInt(data.curiosity_question) || 10,
    };
  }

  _parseClassification(data) {
    return {
      allowed: this._parseList(data.allowed || ''),
    };
  }

  _parseDecision(data) {
    return {
      DIRECT: this._parseList(data.DIRECT || ''),
      RELEVANT: this._parseList(data.RELEVANT || ''),
      PARTIAL: this._parseList(data.PARTIAL || ''),
      UNCLEAR: this._parseList(data.UNCLEAR || ''),
      OFF_TOPIC_WITH_INFORMATION: this._parseList(
        data.OFF_TOPIC_WITH_INFORMATION || ''
      ),
      OFF_TOPIC_WITHOUT_INFORMATION: this._parseList(
        data.OFF_TOPIC_WITHOUT_INFORMATION || ''
      ),
    };
  }

  _parseRetry(data) {
    return {
      max_clarify: parseInt(data.max_clarify) || 1,
      max_redirect: parseInt(data.max_redirect) || 2,
      clarify_1: data.clarify_1 || '',
      clarify_2: data.clarify_2 || '',
      redirect_1: data.redirect_1 || '',
      redirect_2: data.redirect_2 || '',
    };
  }

  _parseNoSupport(data) {
    return {
      patterns: this._parseList(data.patterns || ''),
      response: data.response || '',
      action: data.action || '',
    };
  }

  _parseEmpty(data) {
    return {
      message: data.message || 'Type an answer first.',
    };
  }

  _parseRandom(data) {
    return {
      question_random: data.question_random === 'true',
      response_random: data.response_random === 'true',
      strategy_random: data.strategy_random === 'true',
      avoid_repeat_questions: data.avoid_repeat_questions === 'true',
      avoid_repeat_strategies: data.avoid_repeat_strategies === 'true',
      recent_question_memory: parseInt(data.recent_question_memory) || 4,
      recent_strategy_memory: parseInt(data.recent_strategy_memory) || 2,
    };
  }

  _parseCompletion(data) {
    return {
      core_required: this._parseList(data.core_required || ''),
      optional_targets: this._parseList(data.optional_targets || ''),
    };
  }

  _parseExplore(data) {
    return {
      enabled: data.enabled === 'true',
      max_optional_questions: parseInt(data.max_optional_questions) || 3,
      allowed_targets: this._parseList(data.allowed_targets || ''),
    };
  }

  _parseFreeConversation(data) {
    return {
      enabled: data.enabled === 'true',
    };
  }

  _parseTimer(data) {
    return {
      duration: parseInt(data.duration) || 120,
      closing_threshold: parseInt(data.closing_threshold) || 15,
      closing_message: data.closing_message || '',
      timeout_message: data.timeout_message || '',
    };
  }

  _parseEnd(data) {
    return {
      disable_input: data.disable_input === 'true',
      show_continue: data.show_continue === 'true',
      continue_label: data.continue_label || 'Continue →',
      next_activity: data.next_activity || '',
    };
  }

  _parseGptRules(data) {
    const rules = [];
    
    for (const [key, value] of Object.entries(data)) {
      if (!key.startsWith('_') && !key.startsWith('current') && value && typeof value === 'string') {
        rules.push(value);
      }
    }
    
    if (data._lines && Array.isArray(data._lines)) {
      rules.push(...data._lines);
    }
    
    if (data.items && Array.isArray(data.items)) {
      rules.push(...data.items.filter(r => typeof r === 'string'));
    }
    
    return rules.filter(r => r).join('\n');
  }

  _parseGptAnalysisOutput(data) {
    return {
      schema: {
        classification: '',
        confidence: 0.0,
        information: {
          supporter: null,
          action: null,
          situation: null,
          feeling: null,
          example: null,
          reason: null,
        },
        current_target_answered: false,
        useful_information: false,
      },
    };
  }

  /**
   * Parse comma or line-separated list
   */
  _parseList(str) {
    if (!str) return [];
    // Handle both comma-separated and line-separated
    const separator = str.includes(',') ? ',' : /\n|\s{2,}/;
    return str
      .split(separator)
      .map((item) => item.trim())
      .filter((item) => item && !item.startsWith('-'));
  }

  /**
   * Validate critical config sections
   */
  _validateConfig(config) {
    const required = ['ACTIVITY', 'POLICY', 'OPENING', 'CHECKLIST'];
    for (const section of required) {
      if (!config[section]) {
        this.errors.push(`Missing required section: [${section}]`);
      }
    }
  }

  /**
   * Get a specific section
   */
  getSection(sectionName) {
    return this.config[sectionName] || null;
  }

  /**
   * Get all questions for a checklist item
   */
  getQuestions(target) {
    const section = `QUESTION:${target}`;
    return this.config[section] || [];
  }

  /**
   * Get all responses for a response type
   */
  getResponses(type) {
    const section = `RESPONSE:${type}`;
    return this.config[section] || [];
  }
}

module.exports = BotConfigParser;
