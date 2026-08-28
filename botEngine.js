/**
 * Bot Engine - Deterministic Logic
 * 
 * Handles:
 * 1. Decision making based on classification
 * 2. Checklist updates
 * 3. Target selection
 * 4. Retry/redirect logic
 * 5. Question selection
 * 6. Mode transitions
 */

class BotEngine {
  constructor(config) {
    this.config = config;
  }

  /**
   * Process analysis and make decision
   * Returns: { action, nextTarget, redirect, clarify, updateChecklist }
   * 
   * @param {object} state - Current state
   * @param {object} analysis - Analysis from GPT
   * @param {string} studentInput - Student's message
   * @returns {object} - Engine decision
   */
  processAnalysis(state, analysis, studentInput) {
    const classification = analysis.classification;
    const hasUsefulInfo = analysis.useful_information;

    // Special case: no support detected
    if (this._detectNoSupport(studentInput)) {
      return this._handleNoSupport(state);
    }

    // Route by classification
    switch (classification) {
      case 'DIRECT':
        return this._handleDirect(state, analysis);
      case 'RELEVANT':
        return this._handleRelevant(state, analysis);
      case 'PARTIAL':
        return this._handlePartial(state, analysis);
      case 'UNCLEAR':
        return this._handleUnclear(state, analysis);
      case 'OFF_TOPIC':
        return hasUsefulInfo
          ? this._handleOffTopicWithInfo(state, analysis)
          : this._handleOffTopicNoInfo(state);
      default:
        return this._handleUnclear(state, analysis);
    }
  }

  /**
   * Handle DIRECT classification
   * Update checklist → continue to next missing target
   */
  _handleDirect(state, analysis) {
    const target = state.currentTarget;
    const extracted = this._extractInformation(analysis.information, target);

    return {
      action: 'UPDATE_AND_CONTINUE',
      updateChecklist: {
        target,
        value: extracted,
        complete: true
      },
      nextTarget: this._getNextTarget(state),
      redirect: false,
      clarify: false
    };
  }

  /**
   * Handle RELEVANT classification
   * Extract info → use another missing target (if useful for different item)
   */
  _handleRelevant(state, analysis) {
    // Find which checklist items have info
    const found = this._findFilledItems(analysis.information);

    if (found.length === 0) {
      // No specific info, just continue
      return {
        action: 'CONTINUE',
        updateChecklist: null,
        nextTarget: state.currentTarget,
        redirect: false,
        clarify: false
      };
    }

    // Update the items that were answered
    const primaryTarget = found[0];
    const extracted = this._extractInformation(
      analysis.information,
      primaryTarget
    );

    return {
      action: 'UPDATE_AND_CONTINUE',
      updateChecklist: {
        target: primaryTarget,
        value: extracted,
        complete: true
      },
      nextTarget: this._getNextTarget(state, primaryTarget),
      redirect: false,
      clarify: false
    };
  }

  /**
   * Handle PARTIAL classification
   * Update available info → ask focused follow-up
   */
  _handlePartial(state, analysis) {
    const target = state.currentTarget;
    const extracted = this._extractInformation(analysis.information, target);

    return {
      action: 'UPDATE_AND_ASK_FOLLOWUP',
      updateChecklist: {
        target,
        value: extracted,
        complete: false // Not complete, needs more detail
      },
      nextTarget: target, // Stay on same target
      redirect: false,
      clarify: true,
      followupRequest: `Could you tell me a little more about that?`
    };
  }

  /**
   * Handle UNCLEAR classification
   * Ask for clarification
   */
  _handleUnclear(state, analysis) {
    const maxClarify = this.config.RETRY?.max_clarify || 1;
    const clarifyCount = state.clarifyCount;

    // First attempt: ask to clarify
    if (clarifyCount < maxClarify) {
      return {
        action: 'CLARIFY',
        updateChecklist: null,
        nextTarget: state.currentTarget,
        redirect: false,
        clarify: true,
        clarifyMessage:
          this.config.RETRY?.clarify_1 ||
          'Could you tell me a little more?'
      };
    }

    // Max clarify reached: skip this target
    return {
      action: 'SKIP_TARGET',
      updateChecklist: null,
      nextTarget: this._getNextTarget(state),
      redirect: false,
      clarify: false
    };
  }

  /**
   * Handle OFF_TOPIC with useful information
   * Keep useful info → change to appropriate target
   */
  _handleOffTopicWithInfo(state, analysis) {
    // Find which items have info
    const found = this._findFilledItems(analysis.information);

    if (found.length > 0) {
      const target = found[0];
      const extracted = this._extractInformation(
        analysis.information,
        target
      );

      return {
        action: 'UPDATE_AND_CONTINUE',
        updateChecklist: {
          target,
          value: extracted,
          complete: true
        },
        nextTarget: this._getNextTarget(state, target),
        redirect: false,
        clarify: false
      };
    }

    // No useful info found
    return this._handleOffTopicNoInfo(state);
  }

  /**
   * Handle OFF_TOPIC without useful information
   * Redirect to lesson topic
   */
  _handleOffTopicNoInfo(state) {
    const maxRedirect = this.config.RETRY?.max_redirect || 2;
    const redirectCount = state.redirectCount;

    if (redirectCount === 0) {
      return {
        action: 'REDIRECT',
        updateChecklist: null,
        nextTarget: state.currentTarget,
        redirect: true,
        redirectMessage:
          this.config.RETRY?.redirect_1 ||
          'Let\'s stay with the topic of family support.',
        clarify: false
      };
    }

    if (redirectCount === 1) {
      return {
        action: 'REDIRECT',
        updateChecklist: null,
        nextTarget: state.currentTarget,
        redirect: true,
        redirectMessage:
          this.config.RETRY?.redirect_2 ||
          'Let\'s talk about someone who supports you.',
        clarify: false
      };
    }

    // Max redirects reached: skip target
    return {
      action: 'SKIP_TARGET',
      updateChecklist: null,
      nextTarget: this._getNextTarget(state),
      redirect: false,
      clarify: false
    };
  }

  /**
   * Handle no support detected
   */
  _handleNoSupport(state) {
    return {
      action: 'NO_SUPPORT',
      updateChecklist: null,
      nextTarget: null,
      redirect: true,
      redirectMessage:
        this.config.NO_SUPPORT?.response ||
        'That sounds difficult. You can also think about a teacher or friend.',
      clarify: false,
      endSession: true
    };
  }

  /**
   * Detect "no support" patterns
   */
  _detectNoSupport(input) {
    const patterns = this.config.NO_SUPPORT?.patterns || [];
    const lowerInput = input.toLowerCase();
    return patterns.some((pattern) =>
      lowerInput.includes(pattern.toLowerCase())
    );
  }

  /**
   * Extract information for a specific target
   */
  _extractInformation(information, target) {
    return information[target] || null;
  }

  /**
   * Find which checklist items were filled in analysis
   */
  _findFilledItems(information) {
    return Object.entries(information)
      .filter(([_, value]) => value !== null && value !== undefined)
      .map(([key]) => key);
  }

  /**
   * Get next target to ask about
   * Prioritizes: core required > missing by priority > optional items
   */
  _getNextTarget(state, currentTarget = null) {
    const missing = this._getMissingByPriority(state);

    // Remove current target from consideration if specified
    let candidates = missing;
    if (currentTarget) {
      candidates = missing.filter((t) => t !== currentTarget);
    }

    if (candidates.length > 0) {
      return candidates[0];
    }

    // If core is complete, explore optional (if enabled)
    if (this.config.EXPLORE?.enabled && this._isCoreComplete(state)) {
      const optional = this.config.COMPLETION?.optional_targets || [];
      for (const target of optional) {
        if (state.checklist[target]?.status === 'missing') {
          return target;
        }
      }
    }

    return null; // No more targets
  }

  /**
   * Get missing items sorted by priority
   */
  _getMissingByPriority(state) {
    return Object.entries(state.checklist)
      .filter(([_, item]) => item.status === 'missing')
      .sort((a, b) => b[1].priority - a[1].priority)
      .map(([key]) => key);
  }

  /**
   * Check if core requirements are met
   */
  _isCoreComplete(state) {
    const coreRequired = this.config.COMPLETION?.core_required || [];
    return coreRequired.every(
      (item) => state.checklist[item]?.status === 'complete'
    );
  }

  /**
   * Select a question from question pool
   * Avoids recent questions
   */
  selectQuestion(state, target) {
    const questions = this.config[`QUESTION:${target}`] || [];

    if (questions.length === 0) {
      return `Tell me about ${target}?`;
    }

    const recent = state.history?.questions
      .slice(-4)
      .map((q) => q.question) || [];

    // Filter out recent
    const available = questions.filter((q) => !recent.includes(q));

    // If all were recent, use all
    const pool = available.length > 0 ? available : questions;

    // Random selection
    return pool[Math.floor(Math.random() * pool.length)];
  }

  /**
   * Select a response style
   * Avoids repeating recent styles
   */
  selectResponseStyle(state) {
    const strategy = this.config.STRATEGY || {};
    const styles = [
      { name: 'acknowledge_question', weight: strategy.acknowledge_question },
      { name: 'reflection_question', weight: strategy.reflection_question },
      { name: 'direct_question', weight: strategy.direct_question },
      { name: 'curiosity_question', weight: strategy.curiosity_question }
    ];

    const recent = state.history?.responseStyles?.slice(-2) || [];

    // Filter out recent styles
    const available = styles.filter(
      (s) => !recent.map((r) => r.style).includes(s.name)
    );

    // If no available (all recent), use all
    const pool = available.length > 0 ? available : styles;

    // Weighted random selection
    const totalWeight = pool.reduce((sum, s) => sum + (s.weight || 1), 0);
    let random = Math.random() * totalWeight;

    for (const style of pool) {
      random -= style.weight || 1;
      if (random <= 0) {
        return style.name;
      }
    }

    return pool[0].name;
  }

  /**
   * Check if should close conversation
   * Returns: true if timer expired or all items complete and no explore
   */
  shouldClose(state) {
    // Timer expired
    if (state.timerRemaining <= 0) {
      return true;
    }

    // All core complete and explore disabled
    if (this._isCoreComplete(state) && !this.config.EXPLORE?.enabled) {
      return true;
    }

    // Core complete and explore complete
    if (
      this._isCoreComplete(state) &&
      this.config.EXPLORE?.enabled &&
      this._isExploreComplete(state)
    ) {
      return true;
    }

    return false;
  }

  /**
   * Check if explore phase is complete
   */
  _isExploreComplete(state) {
    const optional = this.config.COMPLETION?.optional_targets || [];
    const maxQuestions = this.config.EXPLORE?.max_optional_questions || 3;

    const exploredCount = state.history.targets.filter((t) =>
      optional.includes(t.target)
    ).length;

    return exploredCount >= maxQuestions;
  }
}

module.exports = BotEngine;
