# 🔐 Verify API - OTP Module

Fintech-grade one-time password (OTP) solution with customizable PIN lengths, message templates, and advanced security features optimized for **all African telecommunications networks**.

## ✨ Features

### Advanced Customization
- ✅ **Flexible PIN Lengths** - 4 to 10 characters
- ✅ **Multiple PIN Types** - Numeric, Alphanumeric, Alphabetic
- ✅ **Custom Templates** - Dynamic message placeholders
- ✅ **Configurable Expiry** - 1 minute to 24 hours
- ✅ **Africa-Wide Support** - All 54 African countries

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

## 🌍 Supported African Countries

### All 54 African Countries Supported

**West Africa:**
- 🇬🇭 Ghana (+233)
- 🇳🇬 Nigeria (+234)
- 🇨🇮 Côte d'Ivoire (+225)
- 🇸🇳 Senegal (+221)
- 🇨🇲 Cameroon (+237)
- 🇧🇫 Burkina Faso (+226)
- 🇲🇱 Mali (+223)
- And more...

**East Africa:**
- 🇰🇪 Kenya (+254)
- 🇹🇿 Tanzania (+255)
- 🇺🇬 Uganda (+256)
- 🇷🇼 Rwanda (+250)
- 🇪🇹 Ethiopia (+251)
- And more...

**Southern Africa:**
- 🇿🇦 South Africa (+27)
- 🇿🇼 Zimbabwe (+263)
- 🇿🇲 Zambia (+260)
- 🇧🇼 Botswana (+267)
- And more...

**North Africa:**
- 🇪🇬 Egypt (+20)
- 🇲🇦 Morocco (+212)
- 🇩🇿 Algeria (+213)
- 🇹🇳 Tunisia (+216)
- And more...

## 📡 API Endpoints

### Request OTP

Generate and send a customizable OTP to **any African country**.

```http
POST /api/v1/verify/otp/request
Content-Type: application/json
X-API-Key: your_api_key

{
  "phone": "+233555539152",
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

**Works for all African numbers:**
```json
// Ghana
{ "phone": "+233244123456" }
{ "phone": "0244123456" }

// Nigeria
{ "phone": "+234803123456" }
{ "phone": "08031234567" }

// Kenya
{ "phone": "+254701123456" }
{ "phone": "0701123456" }

// South Africa
{ "phone": "+27821234567" }
{ "phone": "0821234567" }

// Egypt
{ "phone": "+201012345678" }
{ "phone": "01012345678" }
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
  "phone": "+233555539152",
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
  "phone": "+233555539152"
}
```

## 📱 Phone Number Formats

### Auto-Normalization for All African Countries

The API automatically converts local formats to international E.164 format:

| Country | Local Format | Normalized |
|---------|-------------|------------|
| 🇬🇭 Ghana | `0244123456` | `+233244123456` |
| 🇳🇬 Nigeria | `08031234567` | `+2348031234567` |
| 🇰🇪 Kenya | `0701123456` | `+254701123456` |
| 🇿🇦 South Africa | `0821234567` | `+27821234567` |
| 🇪🇬 Egypt | `01012345678` | `+201012345678` |
| 🇲🇦 Morocco | `0612345678` | `+212612345678` |
| 🇷🇼 Rwanda | `0788123456` | `+250788123456` |
| 🇹🇿 Tanzania | `0754123456` | `+255754123456` |

### Supported Input Formats

```javascript
// ✅ International format (preferred)
"+233244123456"

// ✅ Local format (auto-converted)
"0244123456"

// ✅ Without + (auto-converted)
"233244123456"

// ❌ Invalid formats
"244123456"  // Missing country code
"123456"     // Too short
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

## 📝 Message Templates

### Template Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{code}` | The OTP code (required) | `123456` |
| `{amount}` | Expiry amount | `10` |
| `{duration}` | Expiry duration | `minutes` |
| Custom | Any metadata field | `{transactionId}` |

### Multi-Country Examples

**Ghana (English):**
```
Your {brand} verification code is {code}. Valid for {amount} {duration}.
```

**Nigeria (Pidgin English):**
```
Your {brand} code na {code}. E go expire in {amount} {duration}.
```

**Kenya (Swahili):**
```
Nambari yako ya uthibitisho ni {code}. Itaisha baada ya {amount} {duration}.
```

**South Africa (English/Afrikaans):**
```
Your {brand} verification code is {code}. Dit verval in {amount} {duration}.
```

**Egypt (Arabic support):**
```
رمز التحقق الخاص بك هو {code}. صالح لمدة {amount} {duration}.
```

## 💰 Pricing by Country

| Region | Countries | Rate per OTP | Currency |
|--------|-----------|--------------|----------|
| West Africa | Ghana, Nigeria, Senegal | 0.03-0.05 | GHS/USD |
| East Africa | Kenya, Tanzania, Uganda | 0.03-0.05 | GHS/USD |
| Southern Africa | South Africa, Zimbabwe | 0.04-0.06 | GHS/USD |
| North Africa | Egypt, Morocco, Algeria | 0.03-0.05 | GHS/USD |

*Actual rates vary by country and network. Check pricing API for exact rates.*

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

## 🚨 Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `RATE_LIMIT_EXCEEDED` | Too many requests, cooldown active | 429 |
| `VERIFICATION_FAILED` | Invalid OTP code | 400 |
| `OTP_EXPIRED` | OTP has expired | 400 |
| `MAX_ATTEMPTS_REACHED` | Too many verification attempts | 400 |
| `NO_ACTIVE_OTP` | No OTP found for phone | 400 |
| `INSUFFICIENT_BALANCE` | Account balance too low | 402 |

## 💻 Code Examples

### Multi-Country Implementation

```javascript
// Works for ALL African countries
const countries = [
  { name: 'Ghana', phone: '+233244123456' },
  { name: 'Nigeria', phone: '+234803123456' },
  { name: 'Kenya', phone: '+254701123456' },
  { name: 'South Africa', phone: '+27821234567' },
  { name: 'Egypt', phone: '+201012345678' }
];

async function sendOTPToAfrica(phone, country) {
  const response = await fetch('https://api.africom.com/api/v1/verify/otp/request', {
    method: 'POST',
    headers: {
      'X-API-Key': 'your_api_key',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      phone,
      from: 'MyApp',
      pinLength: 6,
      expiry: { amount: 10, duration: 'minutes' },
      metadata: { country }
    })
  });
  
  return await response.json();
}

// Send to all countries
for (const country of countries) {
  await sendOTPToAfrica(country.phone, country.name);
}
```

### Auto-Format Detection

```javascript
function formatPhoneNumber(phone, country) {
  // Local formats are automatically normalized
  const phones = {
    'GH': '0244123456',      // Ghana local
    'NG': '08031234567',     // Nigeria local
    'KE': '0701123456',      // Kenya local
    'ZA': '0821234567',      // South Africa local
    'EG': '01012345678'      // Egypt local
  };
  
  // API auto-converts to +233244123456, etc.
  return phones[country] || phone;
}
```

## 📞 Support

- Documentation: https://docs.africom.com/verify
- Support: support@africom.com
- Status: https://status.africom.com

---

**🌍 Built for Africa | Supporting All 54 Countries**