# Groq API 400 Error - Fix Guide

## 🔴 Problem Summary
Your bot is experiencing **HTTP 400 errors** when calling the Groq API. The bot falls back to keyword-based responses, which works but isn't optimal.

```
Groq API error: Request failed with status code 400
⚠️  Groq API returned no response - using fallback analysis
✅ Classification: UNCLEAR
⚙️  Action: CLARIFY
```

## ✅ What I Fixed

### 1. **Better Error Logging** (groqClient.js)
- ✅ Now logs full error response data instead of just the message
- ✅ Shows status code and detailed error information from Groq
- ✅ Clear fallback messaging when API unavailable

### 2. **API Key Detection** (groqClient.js)
- ✅ Logs whether GROQ_API_KEY is detected at startup
- ✅ Clear message to set environment variable if missing

### 3. **Response Handling** (botAnalyzer.js)
- ✅ Explicitly checks if response is null before parsing JSON
- ✅ Uses fallback analysis if Groq returns no response
- ✅ Better error messages showing when fallback is triggered

### 4. **Server Diagnostics** (server.js)
- ✅ Logs startup info including environment and API key status
- ✅ Helps debug deployment issues

## 🔧 Next Steps: **ADD GROQ_API_KEY TO RENDER**

The most likely cause is that your **GROQ_API_KEY** is not set in Render's environment variables.

### Action Required:

1. **Get your Groq API key:**
   - Go to https://console.groq.com
   - Sign in or create account
   - Generate an API key
   - Copy the key (starts with `gsk_`)

2. **Set it in Render:**
   - Go to your Render dashboard
   - Select your service (boteng-6380)
   - Go to **Environment** tab
   - Add new environment variable:
     - **Key:** `GROQ_API_KEY`
     - **Value:** `gsk_xxxxxxxxxxxxxxxxxxxx` (your key)
   - Click **Save**
   - Service will auto-redeploy

3. **Verify it worked:**
   - Check deployment logs
   - You should see: `✅ Groq API key detected - AI responses enabled`
   - Next message should work without the 400 error

## 🐛 Debugging Tips

### Check the logs in Render:
Look for these messages:

**✅ Good** (API key is configured):
```
🚀 Bot Engine starting up...
Environment: production
Groq API available: true
✅ Groq API key detected - AI responses enabled
```

**⚠️ Problem** (API key missing):
```
🚀 Bot Engine starting up...
Environment: production
Groq API available: false
⚠️  Groq API key not configured - using fallback responses
```

**🔴 Error** (Invalid API key):
```
Groq API error: ...
Status: 400
Data: { "error": { "message": "Invalid authentication credentials" } }
```

## 📋 Other Possible Causes of 400 Error

If adding the API key doesn't fix it, it could be:

1. **Invalid API key format**
   - Make sure it starts with `gsk_`
   - No extra spaces or characters
   - Full key copied correctly

2. **Model name changed**
   - Current: `mixtral-8x7b-32768`
   - Groq free models: `mixtral-8x7b-32768`, `llama2-70b-4096`, `gemma-7b-it`
   - Check Groq docs for latest available models

3. **Endpoint URL issue**
   - Current: `https://api.groq.com/openai/v1/chat/completions`
   - This is correct for Groq's OpenAI-compatible API

4. **Request body validation**
   - Check that `messages`, `model`, `temperature`, `max_tokens` are valid
   - No NaN or undefined values

## 🧪 Test Locally

To test without deploying:

```bash
# Set API key locally
set GROQ_API_KEY=gsk_xxxx  # Windows
export GROQ_API_KEY=gsk_xxxx  # Mac/Linux

# Run server
npm start

# Send test request
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test","message":"My mother helps me"}'

# Check the response
# If Groq works: response will have AI-generated message
# If Groq fails: response will have keyword-based message
```

## 📝 Summary

The fixes I made will:
1. Show you **exactly** what error Groq is returning
2. Gracefully fall back to keyword matching
3. Log whether API key is configured
4. Help you diagnose the problem

**Next step:** Add `GROQ_API_KEY` to Render environment variables and redeploy.

Questions? Check:
- Render logs for exact error message
- Groq console for account status
- API key validity at https://console.groq.com
