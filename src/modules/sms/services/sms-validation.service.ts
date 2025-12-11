import { logger } from '@utils/logger';
import { detectNetwork } from '@app/middleware/geo.middleware';
import type { SMSValidationResult, MessageUnits } from '../types/sms.types';

export class SMSValidationService {
  // Validate phone number
  static validatePhoneNumber(phone: string): SMSValidationResult {
    const errors: string[] = [];
    
    // Remove all non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, '');

    // Check if starts with +
    if (!cleaned.startsWith('+')) {
      errors.push('Phone number must start with + and country code');
    }

    // Check length
    if (cleaned.length < 10 || cleaned.length > 16) {
      errors.push('Phone number must be between 10 and 15 digits');
    }

    // Detect network and country
    const networkInfo = detectNetwork(cleaned);

    // Validate African country codes
    const africanCountryCodes = [
      '+233', '+234', '+254', '+27', '+256', '+255', '+250', 
      '+225', '+221', '+237', '+20', '+212', '+213', '+251',
    ];

    const isAfrican = africanCountryCodes.some(code => cleaned.startsWith(code));

    if (!isAfrican) {
      logger.warn({ phone: cleaned }, 'Non-African phone number detected');
    }

    return {
      valid: errors.length === 0,
      phone,
      formatted: cleaned,
      country: networkInfo.country || undefined,
      countryCode: cleaned.substring(0, cleaned.length >= 4 ? 4 : 3),
      network: networkInfo.network || undefined,
      operator: networkInfo.operator || undefined,
      type: 'mobile',
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  // Validate multiple phone numbers
  static validatePhoneNumbers(phones: string[]): {
    valid: SMSValidationResult[];
    invalid: SMSValidationResult[];
  } {
    const results = phones.map(phone => this.validatePhoneNumber(phone));
    
    return {
      valid: results.filter(r => r.valid),
      invalid: results.filter(r => !r.valid),
    };
  }

  // Validate message content
  static validateMessage(message: string): {
    valid: boolean;
    length: number;
    errors?: string[];
  } {
    const errors: string[] = [];

    if (!message || message.trim().length === 0) {
      errors.push('Message cannot be empty');
    }

    if (message.length > 1600) {
      errors.push('Message exceeds maximum length of 1600 characters');
    }

    // Check for invalid characters that might cause issues
    const invalidChars = /[^\x00-\x7F\u00A0-\u00FF\u0370-\u03FF\u2000-\u206F]/g;
    if (invalidChars.test(message)) {
      logger.warn({ message: message.substring(0, 50) }, 'Message contains special characters');
    }

    return {
      valid: errors.length === 0,
      length: message.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  // Calculate message units (SMS segments)
  static calculateMessageUnits(message: string): MessageUnits {
    const length = message.length;
    let encoding: 'GSM-7' | 'UCS-2' = 'GSM-7';
    let charactersPerUnit = 160;
    let units = 1;

    // GSM-7 charset
    const gsm7chars = /^[@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&'()*+,\-./0-9:;<=>?¡A-Z¨ÄÖÑܧ¿a-z¬äöñüà]*$/;

    // Check if message contains non-GSM-7 characters
    if (!gsm7chars.test(message)) {
      encoding = 'UCS-2';
      charactersPerUnit = 70;
    }

    // Calculate units based on length
    if (length === 0) {
      units = 0;
    } else if (encoding === 'GSM-7') {
      if (length <= 160) {
        units = 1;
      } else {
        charactersPerUnit = 153; // Concatenated SMS
        units = Math.ceil(length / charactersPerUnit);
      }
    } else {
      // UCS-2 encoding
      if (length <= 70) {
        units = 1;
      } else {
        charactersPerUnit = 67; // Concatenated SMS
        units = Math.ceil(length / charactersPerUnit);
      }
    }

    return {
      messageLength: length,
      units,
      encoding,
      charactersPerUnit,
    };
  }

  // Validate sender ID
  static validateSenderId(senderId: string): {
    valid: boolean;
    errors?: string[];
  } {
    const errors: string[] = [];

    if (senderId.length < 3 || senderId.length > 11) {
      errors.push('Sender ID must be between 3 and 11 characters');
    }

    if (!/^[a-zA-Z0-9]+$/.test(senderId)) {
      errors.push('Sender ID must be alphanumeric only');
    }

    if (/^\d+$/.test(senderId)) {
      errors.push('Sender ID cannot be all numbers');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  // Validate schedule time
  static validateScheduleTime(scheduledFor: Date): {
    valid: boolean;
    error?: string;
  } {
    const now = new Date();
    const maxFuture = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    if (scheduledFor < now) {
      return {
        valid: false,
        error: 'Scheduled time must be in the future',
      };
    }

    if (scheduledFor > maxFuture) {
      return {
        valid: false,
        error: 'Scheduled time cannot be more than 30 days in the future',
      };
    }

    return { valid: true };
  }

  // Replace variables in message template
  static replaceVariables(
    message: string, 
    variables: Record<string, string>
  ): string {
    let result = message;

    for (const [key, value] of Object.entries(variables)) {
      // Replace {{variable}} or {variable} format
      const regex1 = new RegExp(`{{${key}}}`, 'g');
      const regex2 = new RegExp(`{${key}}`, 'g');
      result = result.replace(regex1, value).replace(regex2, value);
    }

    return result;
  }

  // Sanitize message (remove potential issues)
  static sanitizeMessage(message: string): string {
    return message
      .trim()
      .replace(/\r\n/g, '\n') // Normalize line breaks
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n') // Remove excessive line breaks
      .replace(/\s{2,}/g, ' '); // Remove excessive spaces
  }
}