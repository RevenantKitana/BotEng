# Rule-Based Conservative Bot - Architecture

## Overview

Kiến trúc bot được thiết kế theo nguyên tắc **rule-based conservative**: tất cả nội dung sư phạm được định nghĩa trong file config TXT, không được hard-code trong code. Engine quyết định flow, GPT chỉ phục vụ sinh câu tự nhiên.

```
┌─────────────────────────────────────────────┐
│      Unit1_Discussion_Bot.txt (CONFIG)      │
│                                             │
│ • RULES (policy, strictness)               │
│ • CHECKLIST (supporter, action, etc)       │
│ • QUESTION POOL (by target)                │
│ • RESPONSE POOL (templates)                │
│ • TOPIC_BOUNDARY (allowed/forbidden)       │
│ • RETRY/REDIRECT rules                     │
│ • TIMER config                             │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
              ┌─────────────────┐
              │  BotConfigParser│ (botConfigParser.js)
              └────────┬────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│         BotStateManager (State)             │
│                                             │
│ • Checklist (complete/missing)             │
│ • Turn counter                             │
│ • Timer tracking                           │
│ • Question/style history                   │
│ • Retry/redirect counters                  │
└──────────────────────┬──────────────────────┘
                       │
         ┌─────────────┼─────────────┐
         ▼             ▼             ▼
    [Student Input]
         │
         ▼
  ┌──────────────────┐
  │  BotAnalyzer     │ (botAnalyzer.js)
  │                  │
  │ GPT CALL 1:      │
  │ Classify & Extract
  │ → JSON Schema    │
  └────────┬─────────┘
           │
           ▼
    ┌──────────────────┐
    │  Validation      │
    │ • Schema check   │
    │ • Topic check    │
    └────────┬─────────┘
             │
             ▼
┌────────────────────────────────┐
│   BotEngine (botEngine.js)     │
│                                │
│ Decision Rules:                │
│ • DIRECT → update & continue   │
│ • RELEVANT → use another target│
│ • PARTIAL → ask follow-up      │
│ • UNCLEAR → clarify            │
│ • OFF_TOPIC → redirect or skip │
│                                │
│ Deterministic logic (NO GPT!)  │
└────────────┬───────────────────┘
             │
             ▼
    ┌──────────────────┐
    │ Select:          │
    │ • Question       │
    │ • Response style │
    └────────┬─────────┘
             │
             ▼
  ┌──────────────────────┐
  │  BotAnalyzer         │ (GPT CALL 2)
  │  Generate Response   │
  │  (natural language)  │
  └────────┬─────────────┘
           │
           ▼
    ┌──────────────────┐
    │  Validation      │
    │ • Length         │
    │ • Topic          │
    │ • Repeat check   │
    └────────┬─────────┘
             │
    ┌────────┴─────────┐
    ▼                  ▼
  VALID            INVALID
    │                  │
    │                  └──> Fallback Template
    │
    ▼
[Send Response to Client]
```

## Core Components

### 1. Unit1_Discussion_Bot.txt
**Vị trí**: `e:\0. JOBS\BotEng\Unit1_Discussion_Bot.txt`

File config định nghĩa toàn bộ nội dung sư phạm:
- **[ACTIVITY]**: Metadata (ID, title, level, duration)
- **[POLICY]**: Tính cách bot, mức độ bảo thủ
- **[TOPIC_BOUNDARY]**: Topics được phép/cấm
- **[CHECKLIST]**: Các item cần thu thập từ học sinh
- **[QUESTION:target]**: Danh sách câu hỏi cho mỗi target
- **[RESPONSE:type]**: Response templates
- **[RETRY]**: Retry/redirect messages
- **[TIMER]**: Timeout config
- **[GPT_RULES]**: Rules cho GPT analyzer

### 2. BotConfigParser
**Vị trí**: `e:\0. JOBS\BotEng\botConfigParser.js`

Parse file TXT thành structured config object:
- Xử lý 18+ section types
- Validate config completeness
- Return errors nếu missing required sections
- Phương thức: `parse()`, `getSection()`, `getQuestions()`, `getResponses()`

**Usage**:
```javascript
const parser = new BotConfigParser('Unit1_Discussion_Bot.txt');
const result = parser.parse();
const config = result.config;
const questions = parser.getQuestions('supporter');
```

### 3. BotStateManager
**Vị trí**: `e:\0. JOBS\BotEng\conversationManager.js`

Quản lý state của phiên chat:
```javascript
{
  mode: 'CORE',
  turn: 3,
  timerRemaining: 87,
  
  checklist: {
    supporter: { value: 'mother', status: 'complete' },
    action: { value: 'listens to me', status: 'complete' },
    situation: { value: null, status: 'missing' },
    // ...
  },
  
  currentTarget: 'situation',
  
  history: {
    questions: [{ turn, target, question, timestamp }],
    responseStyles: [{ turn, style, timestamp }],
    targets: [{ turn, target, timestamp }],
    inputs: [{ turn, input, timestamp }]
  },
  
  redirectCount: 0,
  clarifyCount: 0
}
```

**Phương thức chính**:
- `updateTimer()` - Cập nhật timer
- `updateChecklist(target, value, complete)` - Update item
- `recordQuestion/recordTarget/recordInput()` - Record history
- `getMissingItems()` - Các item chưa hoàn thành
- `addRedirect()` / `addClarify()` - Increment counters

### 4. BotAnalyzer
**Vị trị**: `e:\0. JOBS\BotEng\botAnalyzer.js`

Gọi Groq API để:
1. **Phân tích input** (`analyzeInput`):
   - Input: student message + current state
   - Output: JSON với classification, extracted info
   - Classifications: DIRECT, RELEVANT, PARTIAL, UNCLEAR, OFF_TOPIC

2. **Sinh câu trả lời** (`generateResponse`):
   - Input: state + response style
   - Output: natural response message
   - Template mode vs GPT generation mode

3. **Validation**:
   - Schema validation
   - Length check (max 300 chars)
   - Forbidden topic check
   - Multiple question check
   - Repeat question check

### 5. BotEngine
**Vị trí**: `e:\0. JOBS\BotEng\botEngine.js`

Quyết định logic (100% deterministic, không gọi GPT):

```
DIRECT
→ update(target, value) → nextTarget = getMissing()

RELEVANT  
→ update(informationFound) → continue with suitable target

PARTIAL
→ update(target, value) → ask follow-up on same target

UNCLEAR (count <= max)
→ ask clarification

UNCLEAR (count > max)
→ skip target → nextTarget

OFF_TOPIC + useful info
→ update(informationFound) → continue

OFF_TOPIC + no info (count <= max)
→ redirect

OFF_TOPIC + no info (count > max)
→ skip target → nextTarget

NO_SUPPORT
→ endSession
```

**Phương thức chính**:
- `processAnalysis(state, analysis, input)` - Make decision
- `selectQuestion(state, target)` - Random question (avoid repeats)
- `selectResponseStyle(state)` - Weighted random style
- `shouldClose(state)` - Check if should end session

### 6. Integration trong server.js

```javascript
// 1. Load config
const configParser = new BotConfigParser('Unit1_Discussion_Bot.txt');
const botConfig = configParser.parse().config;

// 2. Initialize bot modules
const botEngine = new BotEngine(botConfig);
const botAnalyzer = new BotAnalyzer(botConfig, groqClient);

// 3. POST /start
app.post('/start', (req, res) => {
  const stateManager = new BotStateManager(botConfig);
  const sessionId = conversationManager.createSession({
    state: stateManager.getState(),
    config: botConfig
  });
  // Return opening message
});

// 4. POST /chat
app.post('/chat', async (req, res) => {
  // Get state from session
  // Analyze input with GPT
  // Make decision with engine
  // Update state
  // Generate response with GPT
  // Validate response
  // Send to client
});
```

## Flow ví dụ

```
Student: "My mother helps me"
          ↓
GPT Analyze:
  - Classification: DIRECT
  - Extracted: supporter="mother", action="helps me"
  - current_target_answered: true
          ↓
Engine Decision:
  - Action: UPDATE_AND_CONTINUE
  - Update: checklist["supporter"] = "mother" (complete)
  - Update: checklist["action"] = "helps me" (complete)
  - NextTarget: "situation" (missing by priority)
          ↓
Engine Select Question:
  - Target: situation
  - Question: "When do they usually help you?"
          ↓
Engine Select Response Style:
  - Random weighted: acknowledge_question (40%), reflection (30%), etc
          ↓
GPT Generate Response:
  - Input: style + allowed questions
  - Output: "That's nice. When do they usually help you?"
          ↓
Validation:
  - ✓ Length OK
  - ✓ Single question
  - ✓ Topic OK
  - ✓ Not repeated
          ↓
Send to Client:
  {
    botMessage: "That's nice. When do they usually help you?",
    checklist: { supporter: "complete", action: "complete", ... },
    currentTarget: "situation",
    turn: 2
  }
```

## Validation Layers

### Layer 1: Config Validation (Parse time)
- Required sections present?
- Checklist items defined?
- Question pools populated?

### Layer 2: GPT Output Validation (Runtime)
- Valid JSON?
- Schema matches?
- Classification allowed?
- Confidence 0-1?

### Layer 3: Response Validation (Before send)
- Length ≤ 300 chars?
- Max 1 question?
- No forbidden topics?
- Not repeated recently?
- Not asking for known info?

## Timer Management

```
POST /start
→ state.timerStart = now()
→ state.timerRemaining = 120

POST /chat
→ updateTimer()
→ elapsed = (now - timerStart) / 1000
→ timerRemaining = 120 - elapsed

Check 1: timerRemaining <= 0? → END
Check 2: timerRemaining <= closingThreshold (15s)? → closing message
```

## Acceptance Criteria

1. ✅ Config từ TXT (không hard-code)
2. ✅ Deterministic engine (không GPT)
3. ✅ GPT cho semantic analysis + natural responses
4. ✅ Multi-layer validation (schema, topic, repeat)
5. ⏳ Không lặp câu (recent_question_memory = 4)
6. ⏳ Không hỏi lại info đã có (checklist.status = 'complete')
7. ⏳ Không lạc topic (TOPIC_BOUNDARY validation)
8. ⏳ Retry/redirect giới hạn (max_clarify=1, max_redirect=2)
9. ⏳ Timer hoạt động chính xác (120s)
10. ⏳ Không tự ý kết thúc trước timer

## Next Steps (Bước 6)

- [ ] Update test.js với scenarios mới
- [ ] Test config parsing
- [ ] Test state management
- [ ] Test decision engine
- [ ] Test GPT integration
- [ ] Run 50+ test sessions
- [ ] Check acceptance criteria
