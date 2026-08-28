# API Endpoints - Study Buddy Bot

## Base URL
```
https://boteng-6380.onrender.com
```

---

## 1. Start Session
**POST** `/start`

Bắt đầu phiên hội thoại mới.

### Response
```json
{
  "sessionId": "session_1787893484170_0w9sv099d",
  "message": "Who in your family supports you most?",
  "instruction": "Chat with your study buddy.",
  "timeLimit": 120,
  "timestamp": "2026-08-28T05:15:49Z"
}
```

---

## 2. Send Message
**POST** `/chat`

Gửi tin nhắn và nhận phản hồi từ bot.

### Request
```json
{
  "sessionId": "session_1787893484170_0w9sv099d",
  "message": "My mother helps me with homework"
}
```

### Response
```json
{
  "sessionId": "session_1787893484170_0w9sv099d",
  "botMessage": "That's wonderful! How does she help you?",
  "isEnded": false,
  "timeRemaining": 95,
  "currentTarget": "mother",
  "checklist": {
    "mother": { "status": "answered", "value": "helps with homework" },
    "action": { "status": "pending", "value": null }
  },
  "turn": 1,
  "classification": "DIRECT",
  "timestamp": "2026-08-28T05:15:49Z"
}
```

### Error Responses
- **400** - Missing sessionId hoặc message trống
- **404** - Session không tìm thấy
- **500** - Lỗi xử lý

---

## 3. Get Session
**GET** `/session/:sessionId`

Lấy thông tin phiên và lịch sử hội thoại.

### Response
```json
{
  "sessionId": "session_1787893484170_0w9sv099d",
  "isActive": true,
  "elapsedTime": 25.5,
  "timeRemaining": 94.5,
  "timeLimit": 120,
  "state": { "turn": 1, "currentTarget": "mother" },
  "conversationHistory": [
    {
      "user": "My mother helps me",
      "bot": "That's wonderful!",
      "timestamp": "2026-08-28T05:15:49Z",
      "classification": "DIRECT"
    }
  ],
  "startTime": "2026-08-28T05:15:20Z"
}
```

---

## 4. End Session
**DELETE** `/session/:sessionId`

Kết thúc phiên hội thoại.

### Response
```json
{
  "message": "Session ended",
  "sessionId": "session_1787893484170_0w9sv099d"
}
```

---

## 5. Health Check
**GET** `/health`

Kiểm tra trạng thái server.

### Response
```json
{
  "status": "ok",
  "timestamp": "2026-08-28T05:15:49Z"
}
```

---

## 6. Detailed Health Check
**GET** `/checkhealth`

Kiểm tra chi tiết: bộ nhớ, uptime, môi trường.

### Response
```json
{
  "status": "healthy",
  "server": {
    "nodeVersion": "v20.20.2",
    "platform": "linux",
    "uptime": "3600s",
    "environment": "production"
  },
  "memory": {
    "heapUsed": "45MB",
    "heapTotal": "256MB",
    "rss": "128MB"
  },
  "sessions": {
    "active": 5,
    "total": 42
  },
  "timestamp": "2026-08-28T05:15:49Z"
}
```

---

## Message Classifications

Bot phân loại tin nhắn của người dùng:

| Classification | Ý nghĩa | Action |
|---|---|---|
| **DIRECT** | Trả lời trực tiếp câu hỏi hiện tại | Chuyển đến câu hỏi tiếp theo |
| **RELEVANT** | Liên quan nhưng không trực tiếp | Yêu cầu làm rõ |
| **PARTIAL** | Trả lời một phần | Hỏi chi tiết hơn |
| **UNCLEAR** | Chưa rõ | Yêu cầu làm rõ |
| **OFF_TOPIC** | Ngoài chủ đề | Chuyển hướng lại |

---

## Status Codes

| Code | Ý nghĩa |
|---|---|
| **200** | OK - Yêu cầu thành công |
| **400** | Bad Request - Dữ liệu không hợp lệ |
| **404** | Not Found - Session không tìm thấy |
| **500** | Server Error - Lỗi xử lý |

---

## Session Timeout

- **Duration**: 2 phút (120 giây)
- **Auto-cleanup**: Sessions hết hạn sẽ bị xóa tự động sau 15 phút
- **Closing threshold**: 15 giây cuối cùng hiển thị thông báo kết thúc

---

## Example Flow

```
1. POST /start
   → Nhận sessionId

2. POST /chat (message: "My mother")
   → Bot phân tích: DIRECT
   → Bot hỏi: "Tell me more about your mother"

3. POST /chat (message: "She helps me study")
   → Bot phân tích: DIRECT
   → Bot hỏi: "How does she help?"

4. GET /session/:sessionId
   → Xem lịch sử hội thoại

5. DELETE /session/:sessionId
   → Kết thúc phiên
```

---

## CORS

Tất cả endpoints cho phép **CORS** từ mọi nguồn.

**Header**: `Access-Control-Allow-Origin: *`

---

## Authentication

❌ Không yêu cầu authentication

---

## Rate Limiting

⚠️ Không áp dụng (free tier)

**Groq API**: 10,000 messages/day

---

## API Response Format

Tất cả responses:
- Content-Type: `application/json`
- Charset: `UTF-8`
- Status code: HTTP standard
