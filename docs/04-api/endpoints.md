# API Endpoints Specification

> **Status**: [VERIFIED]  
> **Source Baseline**: `api/gemini/*.ts`, `api/telemetry/*.ts`  
> **Audience**: Frontend Developers, Integration Engineers, and QA Automators  

---

## 1. Streaming Adaptive Chat

### `POST /api/gemini/generateAdaptiveResponseStream`

Streams a real-time conversational response tailored to the student's learning strain and pedagogical directives.

#### Request Headers:
```http
Content-Type: application/json
Authorization: Bearer <FIREBASE_ID_TOKEN>
```

#### Request Payload:
```json
{
  "message": "Can you explain pointers in C++?",
  "profile": {
    "level": "Basic",
    "role": "Student",
    "field": "Computer Science",
    "language": "English",
    "accessibilityMode": "None"
  },
  "history": [
    { "role": "user", "content": "Hello Cognify!" },
    { "role": "model", "content": "Hello! How can I assist your study today?" }
  ],
  "attachments": [],
  "studentState": {
    "activePedagogy": "worked_example",
    "learningStrain": {
      "possibleStruggle": 0.82,
      "confidence": 0.9,
      "signals": ["repeated_errors", "high_response_latency"]
    }
  }
}
```

#### Response Stream (Server-Sent Events):
```http
HTTP/1.1 200 OK
Content-Type: text/event-stream; charset=utf-8
Cache-Control: no-cache, no-transform
Connection: keep-alive
X-Accel-Buffering: no

data: {"text":"Think of computer memory like a long street of houses...","done":false}

data: {"text":"Think of computer memory like a long street of houses, where every house has a unique address (like 0x1000) and contains data inside...","done":false}

data: {"text":"...\n:::micro-check\n{\n  \"question\": \"What does the & operator do?\",\n  \"conceptId\": \"pointers\",\n  \"options\": [\"Gets the memory address\", \"Dereferences a pointer\", \"Multiplies values\", \"Deletes data\"],\n  \"correctIndex\": 0,\n  \"explanation\": \"The & operator retrieves the memory address of a variable.\"\n}\n:::","done":true}
```

---

## 2. Non-Streaming Adaptive Chat

### `POST /api/gemini/generateAdaptiveResponse`

Generates an atomic response verified by `qualityGuard.ts` for automatic markdown/LaTeX repair.

#### Request Payload:
Identical to the streaming endpoint above.

#### Response Payload:
```json
{
  "result": "Pointers in C++ are variables that store the memory address of another variable...",
  "warnings": []
}
```
*Note: If unclosed code blocks or LaTeX tags were repaired, `warnings` contains items like `REPAIRED_UNCLOSED_CODE_BLOCK`.*

---

## 3. Universal Multimodal Content

### `POST /api/gemini/generateContent`

Executes multimodal image and document understanding for the Vision Companion or file uploads.

#### Request Payload:
```json
{
  "parts": [
    { "text": "Describe any hazards in this image first, then read visible text." },
    {
      "inlineData": {
        "mimeType": "image/jpeg",
        "data": "/9j/4AAQSkZJRgABAQEASABIAAD/..."
      }
    }
  ]
}
```

#### Response Payload:
```json
{
  "result": "There is a step down directly in front of you. A sign on the right says 'Emergency Exit 50m'."
}
```

---

## 4. Structured Reasoning & Logic

### `POST /api/gemini/generateLogicResponse`

Routes exclusively to deep reasoning models (NVIDIA GLM-5.2 / DeepSeek-R1) with temperature calibrated to $0.7$ and seed set to $42$ for reproducible pedagogical reasoning.

#### Request Payload:
```json
{
  "prompt": "Analyze this recursive tree traversal and compute its Big-O space complexity on the stack.",
  "system": "You are a computer science professor. Explain your reasoning with mathematical proofs."
}
```

#### Response Payload:
```json
{
  "result": "The auxiliary space complexity on the call stack is O(H) where H is the tree height..."
}
```

---

## 5. Security Intrusion Telemetry

### `POST /api/telemetry/securityAudit`

Logs security events triggered by the client-side `securityTracker.ts`.

#### Request Payload:
```json
{
  "type": "DEVTOOLS_OPENED",
  "details": {
    "key": "F12",
    "windowDeltaWidth": 420,
    "timestamp": 1726402400000
  }
}
```

#### Response Payload:
```json
{
  "success": true,
  "auditId": "audit_1726402400123_abc",
  "clientIp": "197.35.120.44",
  "country": "EG"
}
```

---

## 6. Standard Error Codes Matrix

| HTTP Status | Error String | Cause / Resolution |
| :--- | :--- | :--- |
| `400 Bad Request` | `{"error": "message is required"}` | Missing or non-string message in payload. |
| `401 Unauthorized` | `{"error": "Authentication required. Please sign in."}` | Missing, expired, or invalid Firebase Bearer token. |
| `405 Method Not Allowed` | `{"error": "Method not allowed"}` | Attempted GET, PUT, or DELETE on an execution endpoint. |
| `429 Too Many Requests` | `{"error": "User rate limit exceeded. Please wait a moment."}` | Request exceeded 60 req/min per user or 100 req/min per IP. |
| `503 Service Unavailable` | `{"error": "No AI provider key configured on the server."}` | No API keys set in Vercel environment variables. |
| `500 Internal Server Error`| `{"error": "AI request failed"}` | All four providers failed or network timeout occurred. |
