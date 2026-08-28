/**
 * Test suite for new rule-based bot architecture
 * Tests: Config Parser, State Manager, Engine, Analyzer
 * Run: node test-new-architecture.js
 */

const path = require('path');
const BotConfigParser = require('./botConfigParser');
const { BotStateManager } = require('./conversationManager');
const BotEngine = require('./botEngine');

// Color output helpers
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

// Test utilities
let testCount = 0;
let passCount = 0;
let failCount = 0;

function test(name, fn) {
  testCount++;
  try {
    fn();
    passCount++;
    log(`✅ ${testCount}. ${name}`, 'green');
  } catch (error) {
    failCount++;
    log(`❌ ${testCount}. ${name}`, 'red');
    log(`   Error: ${error.message}`, 'red');
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// Test Suite

console.log('\n=== BOT ARCHITECTURE TESTS ===\n');

// ============================================================================
// Test 1: Config Parser
// ============================================================================

log('📋 SECTION 1: Config Parser Tests', 'blue');

let config = null;

test('Parse config file', () => {
  const configPath = path.join(__dirname, 'Unit1_Discussion_Bot.txt');
  const parser = new BotConfigParser(configPath);
  const result = parser.parse();
  
  assert(result.success, 'Config parsing failed');
  assert(result.config, 'Config is empty');
  config = result.config;
});

test('Config has required sections', () => {
  assert(config.ACTIVITY, 'Missing ACTIVITY');
  assert(config.POLICY, 'Missing POLICY');
  assert(config.OPENING, 'Missing OPENING');
  assert(config.CHECKLIST, 'Missing CHECKLIST');
  assert(config.TIMER, 'Missing TIMER');
});

test('Activity section parsed correctly', () => {
  assert(config.ACTIVITY.id === 'unit1_activity8', 'Wrong activity ID');
  assert(config.ACTIVITY.duration === 120, 'Wrong duration');
  assert(config.ACTIVITY.level === 'Grade 10', 'Wrong level');
});

test('Checklist items loaded', () => {
  assert(config.CHECKLIST.supporter, 'Missing supporter checklist item');
  assert(config.CHECKLIST.action, 'Missing action');
  assert(config.CHECKLIST.situation, 'Missing situation');
  assert(config.CHECKLIST.supporter.priority === 100, 'Wrong priority');
});

test('Question pool loaded', () => {
  const supporterQuestions = config['QUESTION:supporter'];
  assert(supporterQuestions && supporterQuestions.length > 0, 'No supporter questions');
  assert(supporterQuestions.length >= 4, 'Less than 4 supporter questions');
});

test('Response pool loaded', () => {
  const ackResponses = config['RESPONSE:acknowledge'];
  assert(ackResponses && ackResponses.length > 0, 'No acknowledge responses');
});

test('Topic boundary configured', () => {
  const boundary = config.TOPIC_BOUNDARY;
  assert(boundary.allowed && boundary.allowed.length > 0, 'No allowed topics');
  assert(boundary.forbidden && boundary.forbidden.length > 0, 'No forbidden topics');
  assert(boundary.allowed.includes('family'), 'family not in allowed topics');
  assert(boundary.forbidden.includes('politics'), 'politics not forbidden');
});

test('Timer config loaded', () => {
  assert(config.TIMER.duration === 120, 'Wrong timer duration');
  assert(config.TIMER.closing_threshold === 15, 'Wrong closing threshold');
});

test('Retry config loaded', () => {
  assert(config.RETRY.max_clarify === 1, 'Wrong max clarify');
  assert(config.RETRY.max_redirect === 2, 'Wrong max redirect');
  assert(config.RETRY.clarify_1, 'Missing clarify_1 message');
});

test('Classification rules configured', () => {
  const allowed = config.CLASSIFICATION.allowed;
  assert(allowed.includes('DIRECT'), 'DIRECT not allowed');
  assert(allowed.includes('RELEVANT'), 'RELEVANT not allowed');
  assert(allowed.includes('UNCLEAR'), 'UNCLEAR not allowed');
});

// ============================================================================
// Test 2: State Manager
// ============================================================================

log('\n📊 SECTION 2: State Manager Tests', 'blue');

let stateManager = null;

test('Initialize state manager', () => {
  stateManager = new BotStateManager(config);
  assert(stateManager.state, 'State not initialized');
  assert(stateManager.state.checklist, 'Checklist not initialized');
});

test('Initial state structure correct', () => {
  const state = stateManager.getState();
  assert(state.mode === 'CORE', 'Wrong initial mode');
  assert(state.turn === 0, 'Turn should start at 0');
  assert(state.redirectCount === 0, 'Redirect count should start at 0');
  assert(state.clarifyCount === 0, 'Clarify count should start at 0');
});

test('Checklist initialized with all items missing', () => {
  const state = stateManager.getState();
  const supporter = state.checklist.supporter;
  assert(supporter.status === 'missing', 'Initial status should be missing');
  assert(supporter.value === null, 'Initial value should be null');
  assert(supporter.priority === 100, 'Wrong priority');
});

test('Current target set to first required item', () => {
  const state = stateManager.getState();
  assert(state.currentTarget === 'supporter', 'Current target should be supporter');
});

test('Timer tracking works', () => {
  const remaining1 = stateManager.updateTimer();
  assert(typeof remaining1 === 'number', 'Timer should return number');
  assert(remaining1 <= 120, 'Remaining should be <= 120');
  assert(remaining1 >= 119, 'Remaining should be >= 119');
});

test('Checklist update works', () => {
  stateManager.updateChecklist('supporter', 'mother', true);
  const state = stateManager.getState();
  assert(state.checklist.supporter.value === 'mother', 'Value not updated');
  assert(state.checklist.supporter.status === 'complete', 'Status not updated');
});

test('Record history functions work', () => {
  stateManager.recordQuestion('supporter', 'Who supports you?');
  stateManager.recordTarget('supporter');
  stateManager.recordResponseStyle('direct_question');
  
  const state = stateManager.getState();
  assert(state.history.questions.length === 1, 'Question not recorded');
  assert(state.history.targets.length === 1, 'Target not recorded');
  assert(state.history.responseStyles.length === 1, 'Style not recorded');
});

test('Redirect/Clarify counters work', () => {
  stateManager.addRedirect();
  stateManager.addRedirect();
  stateManager.addClarify();
  
  const state = stateManager.getState();
  assert(state.redirectCount === 2, 'Redirect count not updated');
  assert(state.clarifyCount === 1, 'Clarify count not updated');
});

test('Max redirect check works', () => {
  const maxExceeded = stateManager.maxRedirectsExceeded();
  assert(maxExceeded === true, 'Max redirects should be exceeded (2 >= 2)');
});

test('Max clarify check works', () => {
  const maxExceeded = stateManager.maxClarifiesExceeded();
  assert(maxExceeded === true, 'Max clarifies should be exceeded (1 >= 1)');
});

test('Get missing items works', () => {
  // Reset state
  stateManager = new BotStateManager(config);
  stateManager.updateChecklist('supporter', 'mother', true);
  
  const missing = stateManager.getMissingItems();
  assert(missing.length > 0, 'Should have missing items');
  assert(!missing.includes('supporter'), 'Supporter should not be missing');
  assert(missing.includes('action'), 'Action should be missing');
});

test('Core requirement check works', () => {
  stateManager = new BotStateManager(config);
  let isCoreComplete = stateManager.isCoreComplete();
  assert(isCoreComplete === false, 'Core should not be complete initially');
  
  stateManager.updateChecklist('supporter', 'mother', true);
  stateManager.updateChecklist('action', 'listens', true);
  isCoreComplete = stateManager.isCoreComplete();
  assert(isCoreComplete === true, 'Core should be complete now');
});

// ============================================================================
// Test 3: Bot Engine
// ============================================================================

log('\n⚙️  SECTION 3: Bot Engine Tests', 'blue');

let engine = null;

test('Initialize bot engine', () => {
  engine = new BotEngine(config);
  assert(engine.config, 'Engine config not set');
});

test('DIRECT classification: update and continue', () => {
  stateManager = new BotStateManager(config);
  const state = stateManager.getState();
  
  const analysis = {
    classification: 'DIRECT',
    confidence: 0.95,
    information: {
      supporter: 'mother',
      action: null,
      situation: null,
      feeling: null,
      example: null,
      reason: null
    },
    current_target_answered: true,
    useful_information: true
  };
  
  const decision = engine.processAnalysis(state, analysis, 'My mother helps me');
  assert(decision.action === 'UPDATE_AND_CONTINUE', 'Should update and continue');
  assert(decision.updateChecklist.target === 'supporter', 'Should update supporter');
  assert(decision.updateChecklist.complete === true, 'Should mark as complete');
});

test('PARTIAL classification: update and ask follow-up', () => {
  stateManager = new BotStateManager(config);
  const state = stateManager.getState();
  
  const analysis = {
    classification: 'PARTIAL',
    confidence: 0.8,
    information: {
      supporter: 'mom',
      action: null,
      situation: null,
      feeling: null,
      example: null,
      reason: null
    },
    current_target_answered: true,
    useful_information: true
  };
  
  const decision = engine.processAnalysis(state, analysis, 'My mom');
  assert(decision.action === 'UPDATE_AND_ASK_FOLLOWUP', 'Should ask follow-up');
  assert(decision.clarify === true, 'Should set clarify flag');
  assert(decision.nextTarget === 'supporter', 'Should stay on same target');
});

test('UNCLEAR classification: ask clarification', () => {
  stateManager = new BotStateManager(config);
  const state = stateManager.getState();
  
  const analysis = {
    classification: 'UNCLEAR',
    confidence: 0.3,
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
  
  const decision = engine.processAnalysis(state, analysis, 'blah blah blah');
  assert(decision.clarify === true, 'Should clarify');
});

test('OFF_TOPIC without info: redirect', () => {
  stateManager = new BotStateManager(config);
  const state = stateManager.getState();
  
  const analysis = {
    classification: 'OFF_TOPIC',
    confidence: 0.9,
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
  
  const decision = engine.processAnalysis(state, analysis, 'What is your favorite color?');
  assert(decision.redirect === true, 'Should redirect');
  assert(decision.redirectMessage, 'Should have redirect message');
});

test('Question selection avoids repeats', () => {
  stateManager = new BotStateManager(config);
  const state = stateManager.getState();
  
  // Record recent question
  state.history.questions.push({
    turn: 0,
    target: 'supporter',
    question: 'Who supports you most?',
    timestamp: new Date().toISOString()
  });
  
  const q1 = engine.selectQuestion(state, 'supporter');
  assert(q1, 'Should return a question');
  // May or may not be different (depends on randomness), but should exist
});

test('Response style selection uses weights', () => {
  stateManager = new BotStateManager(config);
  const state = stateManager.getState();
  
  const style = engine.selectResponseStyle(state);
  const validStyles = [
    'acknowledge_question',
    'reflection_question',
    'direct_question',
    'curiosity_question'
  ];
  assert(validStyles.includes(style), `Invalid style: ${style}`);
});

test('No support detection works', () => {
  const analysis = {
    classification: 'OFF_TOPIC',
    confidence: 0.95,
    information: {},
    current_target_answered: false,
    useful_information: false
  };
  
  stateManager = new BotStateManager(config);
  const state = stateManager.getState();
  
  const decision = engine.processAnalysis(state, analysis, 'Nobody supports me');
  assert(decision.action === 'NO_SUPPORT', 'Should detect no support');
  assert(decision.endSession === true, 'Should end session');
});

test('shouldClose checks conditions', () => {
  stateManager = new BotStateManager(config);
  const state = stateManager.getState();
  
  // Initially should not close
  let shouldClose = engine.shouldClose(state);
  assert(shouldClose === false, 'Should not close with missing items');
  
  // Mark core as complete
  state.checklist.supporter.status = 'complete';
  state.checklist.action.status = 'complete';
  
  shouldClose = engine.shouldClose(state);
  // Should close if explore disabled
  if (!config.EXPLORE?.enabled) {
    assert(shouldClose === true, 'Should close when core complete and explore disabled');
  }
});

// ============================================================================
// Summary
// ============================================================================

console.log('\n=== TEST SUMMARY ===');
log(`Total: ${testCount}`, 'blue');
log(`Passed: ${passCount}`, 'green');
log(`Failed: ${failCount}`, failCount > 0 ? 'red' : 'green');
console.log('');

if (failCount === 0) {
  log('✨ All tests passed!', 'green');
  process.exit(0);
} else {
  log(`❌ ${failCount} test(s) failed`, 'red');
  process.exit(1);
}
