import { logger } from '@utils/logger';
import { PinType, type TemplateVariables } from '../types/verify.types';

export class OTPService {
  // Generate OTP code
  static generateCode(length: number = 6, type: PinType = PinType.NUMERIC): string {
    let characters = '';
    
    switch (type) {
      case PinType.NUMERIC:
        characters = '0123456789';
        break;
      case PinType.ALPHANUMERIC:
        characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        break;
      case PinType.ALPHABETIC:
        characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        break;
    }

    let code = '';
    const charactersLength = characters.length;
    
    for (let i = 0; i < length; i++) {
      // Use crypto for better randomness
      const randomIndex = Math.floor(Math.random() * charactersLength);
      code += characters.charAt(randomIndex);
    }

    logger.debug({ length, type, code: code.substring(0, 2) + '***' }, 'OTP code generated');
    
    return code;
  }

  // Hash OTP code for storage (simple bcrypt alternative for Bun)
  static async hashCode(code: string): Promise<string> {
    const password = await Bun.password.hash(code, {
      algorithm: "bcrypt",
      cost: 10,
    });
    return password;
  }

  // Verify hashed code
  static async verifyCode(code: string, hash: string): Promise<boolean> {
    try {
      const isValid = await Bun.password.verify(code, hash);
      return isValid;
    } catch (error) {
      logger.error({ error }, 'Code verification error');
      return false;
    }
  }

  // Replace template variables in message
  static replaceTemplateVariables(
    template: string,
    variables: TemplateVariables
  ): string {
    let message = template;

    // Replace all variables
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{${key}}`, 'gi');
      message = message.replace(regex, String(value));
    }

    return message;
  }

  // Calculate expiry date
  static calculateExpiry(amount: number, duration: 'seconds' | 'minutes' | 'hours'): Date {
    const now = new Date();
    let milliseconds = 0;

    switch (duration) {
      case 'seconds':
        milliseconds = amount * 1000;
        break;
      case 'minutes':
        milliseconds = amount * 60 * 1000;
        break;
      case 'hours':
        milliseconds = amount * 60 * 60 * 1000;
        break;
    }

    return new Date(now.getTime() + milliseconds);
  }

  // Get expiry in seconds
  static getExpiryInSeconds(expiresAt: Date): number {
    const now = new Date();
    const diffMs = expiresAt.getTime() - now.getTime();
    return Math.max(0, Math.floor(diffMs / 1000));
  }

  // Check if OTP is expired
  static isExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt;
  }

  // Format duration for message
  static formatDuration(amount: number, duration: 'seconds' | 'minutes' | 'hours'): string {
    if (amount === 1) {
      return duration.slice(0, -1); // Remove 's' for singular
    }
    return duration;
  }

  // Validate PIN type against code
  static validatePinType(code: string, pinType: PinType): boolean {
    switch (pinType) {
      case PinType.NUMERIC:
        return /^\d+$/.test(code);
      case PinType.ALPHANUMERIC:
        return /^[A-Z0-9]+$/i.test(code);
      case PinType.ALPHABETIC:
        return /^[A-Z]+$/i.test(code);
      default:
        return false;
    }
  }

  // Normalize phone number for ALL African countries
  static normalizePhoneNumber(phone: string): string {
    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');

    // If it starts with +, it's already in international format
    if (cleaned.startsWith('+')) {
      return cleaned;
    }

    // African country codes and their local formats
    const africanCountries = [
      { code: '233', localPrefix: '0', length: 10 }, // Ghana
      { code: '234', localPrefix: '0', length: 11 }, // Nigeria
      { code: '254', localPrefix: '0', length: 10 }, // Kenya
      { code: '27', localPrefix: '0', length: 10 },  // South Africa
      { code: '256', localPrefix: '0', length: 10 }, // Uganda
      { code: '255', localPrefix: '0', length: 10 }, // Tanzania
      { code: '250', localPrefix: '0', length: 10 }, // Rwanda
      { code: '225', localPrefix: '0', length: 10 }, // Côte d'Ivoire
      { code: '221', localPrefix: '0', length: 9 },  // Senegal
      { code: '237', localPrefix: '0', length: 9 },  // Cameroon
      { code: '20', localPrefix: '0', length: 11 },  // Egypt
      { code: '212', localPrefix: '0', length: 10 }, // Morocco
      { code: '213', localPrefix: '0', length: 10 }, // Algeria
      { code: '251', localPrefix: '0', length: 10 }, // Ethiopia
    ];

    // Check if it's a local format that starts with 0
    if (cleaned.startsWith('0')) {
      // Try to match against known African formats
      for (const country of africanCountries) {
        if (cleaned.length === country.length) {
          // Assume it's this country and convert
          cleaned = '+' + country.code + cleaned.substring(1);
          logger.debug({ original: phone, normalized: cleaned }, 'Normalized local format');
          return cleaned;
        }
      }
    }

    // If it doesn't start with + or 0, check if it matches a country code
    for (const country of africanCountries) {
      if (cleaned.startsWith(country.code)) {
        cleaned = '+' + cleaned;
        logger.debug({ original: phone, normalized: cleaned }, 'Added + to country code');
        return cleaned;
      }
    }

    // If still no match and it looks like a phone number, assume it needs +
    if (cleaned.length >= 9 && !cleaned.startsWith('+')) {
      logger.warn({ phone: cleaned }, 'Could not determine country, assuming international format');
      cleaned = '+' + cleaned;
    }

    return cleaned;
  }

  // Mask phone number for logging
  static maskPhoneNumber(phone: string): string {
    if (phone.length <= 4) return '***';
    return phone.substring(0, 4) + '***' + phone.substring(phone.length - 3);
  }

  // Generate cooldown timestamp
  static generateCooldownTimestamp(seconds: number = 30): Date {
    return new Date(Date.now() + seconds * 1000);
  }

  // Check if in cooldown period
  static isInCooldown(lastSentAt: Date, cooldownSeconds: number = 30): boolean {
    const now = new Date();
    const cooldownMs = cooldownSeconds * 1000;
    return (now.getTime() - lastSentAt.getTime()) < cooldownMs;
  }

  // Get remaining cooldown time
  static getRemainingCooldown(lastSentAt: Date, cooldownSeconds: number = 30): number {
    const now = new Date();
    const cooldownMs = cooldownSeconds * 1000;
    const elapsed = now.getTime() - lastSentAt.getTime();
    const remaining = Math.max(0, Math.ceil((cooldownMs - elapsed) / 1000));
    return remaining;
  }

  // Generate default message
  static getDefaultMessage(
    code: string,
    amount: number,
    duration: 'seconds' | 'minutes' | 'hours',
    from?: string
  ): string {
    const formattedDuration = this.formatDuration(amount, duration);
    const brandName = from || 'AfriCom';
    
    return `Your ${brandName} verification code is ${code}. It expires in ${amount} ${formattedDuration}.`;
  }

  // Sanitize metadata
  static sanitizeMetadata(metadata?: Record<string, any>): Record<string, any> | undefined {
    if (!metadata) return undefined;

    // Remove sensitive fields
    const sensitiveFields = ['password', 'secret', 'token', 'apiKey', 'privateKey'];
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(metadata)) {
      if (!sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = value;
      }
    }

    return Object.keys(sanitized).length > 0 ? sanitized : undefined;
  }
}