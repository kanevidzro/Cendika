# 📱 SMS Module

Complete SMS messaging solution for African telecommunications networks.

## Features

- ✅ **Single SMS Sending** - Send individual SMS messages
- ✅ **Bulk SMS** - Send up to 10,000 messages per batch
- ✅ **Scheduled SMS** - Schedule messages for future delivery
- ✅ **Smart Routing** - Automatically routes to best provider
- ✅ **Multi-Network Support** - Works across all African networks
- ✅ **Message Tracking** - Real-time delivery status
- ✅ **Analytics** - Comprehensive SMS analytics and trends
- ✅ **Variable Replacement** - Dynamic message personalization
- ✅ **Cost Estimation** - Accurate cost calculation
- ✅ **Sender ID Management** - Custom sender ID support

## API Endpoints

### Send Single SMS

```http
POST /api/v1/sms/send
Content-Type: application/json
X-API-Key: your_api_key

{
  "to": "+233244123456",
  "message": "Hello from AfriCom!",
  "senderId": "AfriCom"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "msg_xxx",
    "to": "+233244123456",
    "from": "AfriCom",
    "message": "Hello from AfriCom!",
    "status": "QUEUED",
    "provider": "mtn",
    "cost": 0.05,
    "currency": "GHS",
    "units": 1,
    "createdAt": "2025-01-15T10:00:00Z"
  }
}
```

### Send Bulk SMS

```http
POST /api/v1/sms/bulk/send
Content-Type: application/json
X-API-Key: your_api_key

{
  "recipients": [
    {
      "to": "+233244123456",
      "variables": { "name": "John" }
    },
    {
      "to": "+233541234567",
      "variables": { "name": "Jane" }
    }
  ],
  "message": "Hello {{name}}, welcome to AfriCom!",
  "senderId": "AfriCom"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "batchId": "batch_xxx",
    "totalRecipients": 2,
    "accepted": 2,
    "rejected": 0,
    "estimatedCost": 0.10,
    "currency": "GHS",
    "messages": [
      {
        "id": "msg_xxx1",
        "to": "+233244123456",
        "status": "accepted"
      },
      {
        "id": "msg_xxx2",
        "to": "+233541234567",
        "status": "accepted"
      }
    ]
  }
}
```

### Get SMS Status

```http
GET /api/v1/sms/{id}/status
X-API-Key: your_api_key
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "msg_xxx",
    "to": "+233244123456",
    "status": "DELIVERED",
    "provider": "mtn",
    "sentAt": "2025-01-15T10:00:05Z",
    "deliveredAt": "2025-01-15T10:00:10Z"
  }
}
```

### List SMS Messages

```http
GET /api/v1/sms?page=1&limit=20&status=DELIVERED
X-API-Key: your_api_key
```

### Get SMS Analytics

```http
GET /api/v1/sms/analytics/overview?startDate=2025-01-01&endDate=2025-01-31
X-API-Key: your_api_key
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalSent": 1000,
    "totalDelivered": 950,
    "totalFailed": 50,
    "totalPending": 0,
    "deliveryRate": 95.0,
    "totalCost": 50.00,
    "currency": "GHS",
    "byNetwork": {
      "mtn": {
        "sent": 600,
        "delivered": 580,
        "failed": 20,
        "cost": 30.00
      },
      "vodafone": {
        "sent": 400,
        "delivered": 370,
        "failed": 30,
        "cost": 20.00
      }
    }
  }
}
```

## Message Units & Pricing

### GSM-7 Encoding (English)
- Single SMS: 160 characters = 1 unit
- Concatenated: 153 characters per unit

### UCS-2 Encoding (Unicode/Emojis)
- Single SMS: 70 characters = 1 unit
- Concatenated: 67 characters per unit

### Pricing by Country

| Country | Rate per Unit | Currency |
|---------|--------------|----------|
| Ghana (GH) | 0.05 | GHS |
| Nigeria (NG) | 0.06 | GHS |
| Kenya (KE) | 0.05 | GHS |
| South Africa (ZA) | 0.07 | GHS |

## Supported Networks

### Ghana 🇬🇭
- MTN Ghana
- Vodafone Ghana
- AirtelTigo

### Nigeria 🇳🇬
- MTN Nigeria
- Glo Mobile
- Airtel Nigeria
- 9mobile

### Kenya 🇰🇪
- Safaricom
- Airtel Kenya
- Telkom Kenya

### South Africa 🇿🇦
- Vodacom
- MTN South Africa
- Cell C

## Phone Number Format

Always use E.164 format:
- ✅ `+233244123456` (Ghana)
- ✅ `+234803123456` (Nigeria)
- ✅ `+254701123456` (Kenya)
- ❌ `0244123456` (Missing country code)
- ❌ `233244123456` (Missing +)

## Variable Replacement

Use `{{variable}}` or `{variable}` in messages:

```json
{
  "message": "Hello {{name}}, your balance is {{balance}}",
  "variables": {
    "name": "John",
    "balance": "GHS 100.00"
  }
}
```

## Scheduled SMS

Schedule messages for future delivery:

```json
{
  "to": "+233244123456",
  "message": "Reminder: Your appointment is tomorrow",
  "scheduledFor": "2025-01-16T09:00:00Z"
}
```

## Rate Limiting

- Default: 100 requests per minute per API key
- SMS specific: 100 SMS per minute
- Bulk SMS: 10,000 recipients maximum per batch

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_PHONE_NUMBER` | Phone number format invalid |
| `INVALID_MESSAGE` | Message content invalid |
| `NO_PROVIDER_AVAILABLE` | No SMS provider for destination |
| `INSUFFICIENT_BALANCE` | Account balance too low |
| `SENDER_ID_NOT_FOUND` | Sender ID not approved |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `BULK_LIMIT_EXCEEDED` | Too many recipients in batch |

## Best Practices

1. **Phone Number Validation**: Always validate before sending
2. **Message Length**: Keep under 160 chars for single unit
3. **Sender ID**: Use approved sender IDs only
4. **Bulk Sending**: Batch in groups of 1000-5000 for best performance
5. **Error Handling**: Always check response status
6. **Scheduled Messages**: Schedule at least 5 minutes in advance
7. **Cost Management**: Check balance before bulk operations

## Examples

### Node.js Example

```javascript
const axios = require('axios');

async function sendSMS(to, message) {
  try {
    const response = await axios.post(
      'https://api.africom.com/api/v1/sms/send',
      {
        to,
        message,
        senderId: 'AfriCom'
      },
      {
        headers: {
          'X-API-Key': 'your_api_key',
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('SMS sent:', response.data);
    return response.data;
  } catch (error) {
    console.error('SMS error:', error.response?.data || error.message);
    throw error;
  }
}

// Usage
sendSMS('+233244123456', 'Hello from Node.js!');
```

### Python Example

```python
import requests

def send_sms(to, message):
    url = 'https://api.africom.com/api/v1/sms/send'
    headers = {
        'X-API-Key': 'your_api_key',
        'Content-Type': 'application/json'
    }
    data = {
        'to': to,
        'message': message,
        'senderId': 'AfriCom'
    }
    
    response = requests.post(url, json=data, headers=headers)
    response.raise_for_status()
    
    return response.json()

# Usage
result = send_sms('+233244123456', 'Hello from Python!')
print(result)
```

### cURL Example

```bash
curl -X POST https://api.africom.com/api/v1/sms/send \
  -H "X-API-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+233244123456",
    "message": "Hello from cURL!",
    "senderId": "AfriCom"
  }'
```

## Testing

See `tests/unit/modules/sms/` for unit tests and `tests/integration/api/sms-api.test.ts` for integration tests.

## Support

For issues or questions:
- Documentation: https://docs.africom.com/sms
- Support: support@africom.com
- Status: https://status.africom.com