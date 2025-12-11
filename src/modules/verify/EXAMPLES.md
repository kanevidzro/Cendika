# 🔐 Verify API - OTP Module

Fintech-grade one-time password (OTP) solution with customizable PIN lengths, message templates, and advanced security features optimized for African telecommunications.

## ✨ Features

### Advanced Customization
- ✅ **Flexible PIN Lengths** - 4 to 10 characters
- ✅ **Multiple PIN Types** - Numeric, Alphanumeric, Alphabetic
- ✅ **Custom Templates** - Dynamic message placeholders
- ✅ **Configurable Expiry** - 1 minute to 24 hours
- ✅ **Ghana-Optimized** - Built for local phone formats

### Fintech-Grade Security
- ✅ **Attempt Tracking** - Monitor verification attempts
- ✅ **Automatic Blocking** - Prevent brute force attacks
- ✅ **Expiry Validation** - Time-bound codes
- ✅ **Single-Use Codes** - Automatic invalidation
- ✅ **Metadata Support** - Track transaction context

### Enterprise Features
- ✅ **Template Variables** - `{code}`, `{amount}`, `{duration}`
- ✅ **Retry Control** - Configurable max attempts
- ✅ **Cooldown Periods** - 30-second rate limiting
- ✅ **Detailed Responses** - Comprehensive error messages
- ✅ **Analytics** - Verification statistics

## 📡 API Endpoints

### Request OTP

Generate and send a customizable OTP.

```http
POST /api/v1/verify/otp/request
Content-Type: application/json
X-API-Key: your_api_key

{
  "phone": "0555539152",
  "from": "YourBrand",
  "message": "Your verification code is {code}, it expires in {amount} {duration}",
  "pinLength": 6,
  "pinType": "NUMERIC",
  "expiry": {
    "amount": 10,
    "duration": "minutes"
  },
  "maxAttempts": 3,
  "metadata": {
    "transactionId": "txn_12345",
    "amount": 500
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "otp_xxx",
    "phone": "+233555539152",
    "from": "YourBrand",
    "expiresAt": "2025-01-15T10:10:00Z",
    "expiresIn": 600,
    "status": "PENDING"
  },
  "message": "OTP sent successfully"
}
```

### Verify OTP

Validate an OTP code with security tracking.

```http
POST /api/v1/verify/otp/verify
Content-Type: application/json
X-API-Key: your_api_key

{
  "phone": "0555539152",
  "code": "123456"
}
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "phone": "+233555539152",
    "verified": true,
    "message": "OTP verified successfully",
    "metadata": {
      "transactionId": "txn_12345",
      "amount": 500
    },
    "verifiedAt": "2025-01-15T10:05:30Z"
  }
}
```

**Failure Response:**
```json
{
  "success": false,
  "error": {
    "code": "VERIFICATION_FAILED",
    "message": "Invalid code. 2 attempts remaining.",
    "details": {
      "attemptsLeft": 2
    }
  }
}
```

### Resend OTP

Resend OTP with same configuration.

```http
POST /api/v1/verify/otp/resend
Content-Type: application/json
X-API-Key: your_api_key

{
  "phone": "0555539152"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "otp_yyy",
    "phone": "+233555539152",
    "from": "YourBrand",
    "expiresAt": "2025-01-15T10:20:00Z",
    "expiresIn": 600,
    "message": "OTP resent successfully"
  }
}
```

### Check OTP Status

Check if there's an active OTP for a phone number.

```http
GET /api/v1/verify/otp/status?phone=0555539152
X-API-Key: your_api_key
```

**Response:**
```json
{
  "success": true,
  "data": {
    "hasActiveOTP": true,
    "status": "PENDING",
    "expiresAt": "2025-01-15T10:10:00Z",
    "expiresIn": 420,
    "attempts": 1,
    "maxAttempts": 3,
    "attemptsLeft": 2
  }
}
```

### Get Analytics

Get OTP verification statistics.

```http
GET /api/v1/verify/otp/analytics?startDate=2025-01-01&endDate=2025-01-31
X-API-Key: your_api_key
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalSent": 1000,
    "totalVerified": 920,
    "totalFailed": 50,
    "totalExpired": 30,
    "verificationRate": 92.0,
    "averageAttempts": 1.2,
    "cost": 30.00,
    "currency": "GHS"
  }
}
```

## 🎨 PIN Types

### Numeric (Default)
- Characters: `0-9`
- Example: `123456`
- Best for: Standard OTP verification

### Alphanumeric
- Characters: `0-9`, `A-Z`
- Example: `A3B7C9`
- Best for: Higher security requirements

### Alphabetic
- Characters: `A-Z`
- Example: `ABCDEF`
- Best for: Voice-friendly codes

## ⏱️ Expiry Configuration

### Minimum: 1 minute
```json
{
  "expiry": {
    "amount": 1,
    "duration": "minutes"
  }
}
```

### Default: 10 minutes
```json
{
  "expiry": {
    "amount": 10,
    "duration": "minutes"
  }
}
```

### Maximum: 24 hours
```json
{
  "expiry": {
    "amount": 24,
    "duration": "hours"
  }
}
```

## 📱 Phone Number Formats

The API automatically normalizes phone numbers:

### Supported Formats
- ✅ `0555539152` (Ghana local format)
- ✅ `233555539152` (Without +)
- ✅ `+233555539152` (International format - preferred)

### Auto-Conversion
```
Input: 0555539152
Output: +233555539152
```

## 📝 Message Templates

### Template Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{code}` | The OTP code (required) | `123456` |
| `{amount}` | Expiry amount | `10` |
| `{duration}` | Expiry duration | `minutes` |
| Custom | Any metadata field | `{transactionId}` |

### Examples

**Basic Template:**
```
Your verification code is {code}
```

**With Expiry:**
```
Your code is {code}. It expires in {amount} {duration}.
```

**Financial Transaction:**
```
Your {brand} verification code is {code} for transaction {transactionId} of GHS {amount}. Valid for {amount} {duration}.
```

**Custom Brand:**
```
Welcome to {brand}! Your verification code is {code}. This code will expire in {amount} {duration}.
```

## 🔒 Security Features

### Attempt Limiting
- Default: 3 attempts
- Range: 1-10 attempts
- Auto-blocking after max attempts

### Rate Limiting
- 30-second cooldown between requests
- 10 requests per minute per API key
- Prevents spam and abuse

### Code Hashing
- Codes are hashed using bcrypt
- Never stored in plain text
- Secure verification process

### Single-Use Codes
- Codes are invalidated after use
- Prevents replay attacks
- Automatic cleanup of expired codes

## 💰 Pricing

| Service | Cost | Currency |
|---------|------|----------|
| OTP Request | 0.03 | GHS |
| OTP Verify | Free | - |
| OTP Resend | 0.03 | GHS |

## 🚨 Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `RATE_LIMIT_EXCEEDED` | Too many requests, cooldown active | 429 |
| `VERIFICATION_FAILED` | Invalid OTP code | 400 |
| `OTP_EXPIRED` | OTP has expired | 400 |
| `MAX_ATTEMPTS_REACHED` | Too many verification attempts | 400 |
| `NO_ACTIVE_OTP` | No OTP found for phone | 400 |
| `INSUFFICIENT_BALANCE` | Account balance too low | 402 |

## 📊 Best Practices

### 1. **Appropriate Expiry Times**
```javascript
// Short-lived for sensitive operations
{ amount: 5, duration: 'minutes' }

// Standard for general verification
{ amount: 10, duration: 'minutes' }

// Long-lived for email verification
{ amount: 30, duration: 'minutes' }
```

### 2. **Clear Message Templates**
```javascript
// ✅ Good - Clear and concise
"Your verification code is {code}. Valid for {amount} {duration}."

// ❌ Bad - Too verbose
"Hello! We are sending you this message to inform you that your verification code is {code} and it will be valid for the next {amount} {duration} so please use it before it expires. Thank you!"
```

### 3. **Proper Error Handling**
```javascript
try {
  const result = await verifyOTP(phone, code);
  if (result.verified) {
    // Success - proceed with action
  } else {
    // Failed - show attempts left
    console.log(`Attempts left: ${result.attemptsLeft}`);
  }
} catch (error) {
  // Handle rate limiting, expired OTP, etc.
}
```

### 4. **Metadata Usage**
```javascript
// Store transaction context
{
  metadata: {
    transactionId: "txn_12345",
    amount: 500,
    currency: "GHS",
    purpose: "withdrawal",
    timestamp: new Date().toISOString()
  }
}
```

## 💻 Code Examples

### Node.js

```javascript
const axios = require('axios');

async function sendOTP(phone) {
  const response = await axios.post(
    'https://api.africom.com/api/v1/verify/otp/request',
    {
      phone,
      from: 'MyApp',
      pinLength: 6,
      pinType: 'NUMERIC',
      expiry: {
        amount: 10,
        duration: 'minutes'
      }
    },
    {
      headers: {
        'X-API-Key': 'your_api_key',
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data;
}

async function verifyOTP(phone, code) {
  const response = await axios.post(
    'https://api.africom.com/api/v1/verify/otp/verify',
    { phone, code },
    {
      headers: {
        'X-API-Key': 'your_api_key',
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data;
}
```

### Python

```python
import requests

def send_otp(phone):
    url = 'https://api.africom.com/api/v1/verify/otp/request'
    headers = {
        'X-API-Key': 'your_api_key',
        'Content-Type': 'application/json'
    }
    data = {
        'phone': phone,
        'from': 'MyApp',
        'pinLength': 6,
        'pinType': 'NUMERIC',
        'expiry': {
            'amount': 10,
            'duration': 'minutes'
        }
    }
    
    response = requests.post(url, json=data, headers=headers)
    return response.json()

def verify_otp(phone, code):
    url = 'https://api.africom.com/api/v1/verify/otp/verify'
    headers = {
        'X-API-Key': 'your_api_key',
        'Content-Type': 'application/json'
    }
    data = {'phone': phone, 'code': code}
    
    response = requests.post(url, json=data, headers=headers)
    return response.json()
```

### cURL

```bash
# Request OTP
curl -X POST https://api.africom.com/api/v1/verify/otp/request \
  -H "X-API-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "0555539152",
    "from": "MyApp",
    "pinLength": 6,
    "pinType": "NUMERIC",
    "expiry": {
      "amount": 10,
      "duration": "minutes"
    }
  }'

# Verify OTP
curl -X POST https://api.africom.com/api/v1/verify/otp/verify \
  -H "X-API-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "0555539152",
    "code": "123456"
  }'
```

## 🔄 Flow Diagram

```
1. Request OTP
   ├─ Validate phone & parameters
   ├─ Check rate limit (30s cooldown)
   ├─ Generate code (4-10 chars)
   ├─ Hash code with bcrypt
   ├─ Store in database
   ├─ Send via SMS
   └─ Return success

2. Verify OTP
   ├─ Validate phone & code
   ├─ Find active OTP
   ├─ Check expiry
   ├─ Check max attempts
   ├─ Verify code hash
   ├─ Increment attempts (if failed)
   ├─ Mark as verified (if success)
   └─ Return result

3. Resend OTP
   ├─ Check rate limit (30s cooldown)
   ├─ Get previous OTP config
   ├─ Invalidate old OTP
   ├─ Generate new code
   ├─ Send via SMS
   └─ Return success
```

## 📞 Support

- Documentation: https://docs.africom.com/verify
- Support: support@africom.com
- Status: https://status.africom.com