import type { Context, Next } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { ResponseBuilder } from '@utils/api-response';
import { logger } from '@utils/logger';

// Custom validator that returns formatted errors
export const validate = (target: 'json' | 'query' | 'param' | 'header', schema: z.ZodSchema) => {
  return zValidator(target, schema, (result, c) => {
    if (!result.success) {
      const errors = result.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
      }));

      logger.warn({
        target,
        path: c.req.path,
        errors,
      }, 'Validation error');

      return ResponseBuilder.validationError(c, errors);
    }
  });
};

// Common validation schemas
export const commonSchemas = {
  // Pagination
  pagination: z.object({
    page: z.string().optional().transform(v => v ? parseInt(v) : 1),
    limit: z.string().optional().transform(v => v ? parseInt(v) : 20),
  }),

  // Date range
  dateRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),

  // ID parameter
  idParam: z.object({
    id: z.string().min(1),
  }),

  // Phone number (international format)
  phoneNumber: z.string()
    .min(10)
    .max(15)
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),

  // Email
  email: z.string().email('Invalid email format'),

  // Country code (ISO 3166-1 alpha-2)
  countryCode: z.string()
    .length(2)
    .regex(/^[A-Z]{2}$/, 'Invalid country code')
    .toUpperCase(),

  // Currency code (ISO 4217)
  currencyCode: z.string()
    .length(3)
    .regex(/^[A-Z]{3}$/, 'Invalid currency code')
    .toUpperCase(),

  // Language code (ISO 639-1)
  languageCode: z.string()
    .length(2)
    .regex(/^[a-z]{2}$/, 'Invalid language code')
    .toLowerCase(),

  // URL
  url: z.string().url('Invalid URL format'),

  // API Key
  apiKey: z.string()
    .min(32)
    .regex(/^ak_[a-z]+_[a-zA-Z0-9]+$/, 'Invalid API key format'),
};

// Phone number validation and formatting
export const validatePhoneNumber = (phone: string, country?: string): {
  valid: boolean;
  formatted?: string;
  country?: string;
  error?: string;
} => {
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');

  // Check if it starts with +
  if (!cleaned.startsWith('+')) {
    return {
      valid: false,
      error: 'Phone number must start with + and country code',
    };
  }

  // Validate length (E.164 format: +[1-15 digits])
  if (cleaned.length < 10 || cleaned.length > 16) {
    return {
      valid: false,
      error: 'Phone number must be between 10 and 15 digits',
    };
  }

  // African country codes validation
  const africanCountryCodes = [
    '+233', // Ghana
    '+234', // Nigeria
    '+254', // Kenya
    '+27',  // South Africa
    '+256', // Uganda
    '+255', // Tanzania
    '+250', // Rwanda
    '+225', // Côte d'Ivoire
    '+221', // Senegal
    '+237', // Cameroon
  ];

  const hasValidAfricanCode = africanCountryCodes.some(code => 
    cleaned.startsWith(code)
  );

  if (!hasValidAfricanCode) {
    logger.warn({ phone: cleaned }, 'Non-African phone number detected');
  }

  return {
    valid: true,
    formatted: cleaned,
    country: country,
  };
};

// Email validation
export const validateEmail = (email: string): {
  valid: boolean;
  normalized?: string;
  error?: string;
} => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return {
      valid: false,
      error: 'Invalid email format',
    };
  }

  // Normalize email (lowercase)
  const normalized = email.toLowerCase().trim();

  return {
    valid: true,
    normalized,
  };
};

// Amount validation
export const validateAmount = (amount: number, min: number = 0, max?: number): {
  valid: boolean;
  error?: string;
} => {
  if (amount < min) {
    return {
      valid: false,
      error: `Amount must be at least ${min}`,
    };
  }

  if (max && amount > max) {
    return {
      valid: false,
      error: `Amount must not exceed ${max}`,
    };
  }

  // Check for valid decimal places (max 2)
  if (!/^\d+(\.\d{1,2})?$/.test(amount.toString())) {
    return {
      valid: false,
      error: 'Amount must have at most 2 decimal places',
    };
  }

  return {
    valid: true,
  };
};

// Sanitize input to prevent XSS
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

// Validate sender ID (alphanumeric)
export const validateSenderId = (senderId: string): {
  valid: boolean;
  error?: string;
} => {
  // Sender ID must be 3-11 alphanumeric characters
  if (senderId.length < 3 || senderId.length > 11) {
    return {
      valid: false,
      error: 'Sender ID must be between 3 and 11 characters',
    };
  }

  // Must be alphanumeric
  if (!/^[a-zA-Z0-9]+$/.test(senderId)) {
    return {
      valid: false,
      error: 'Sender ID must be alphanumeric only',
    };
  }

  // Should not be all numbers (looks like phone number)
  if (/^\d+$/.test(senderId)) {
    return {
      valid: false,
      error: 'Sender ID cannot be all numbers',
    };
  }

  return {
    valid: true,
  };
};

// Bulk validation middleware
export const validateBulkRequest = (maxItems: number = 1000) => {
  return async (c: Context, next: Next) => {
    const body = await c.req.json();

    if (!Array.isArray(body.recipients) && !Array.isArray(body.items)) {
      return ResponseBuilder.validationError(c, [{
        field: 'recipients or items',
        message: 'Must provide an array of recipients or items',
        code: 'invalid_type',
      }]);
    }

    const items = body.recipients || body.items;

    if (items.length === 0) {
      return ResponseBuilder.validationError(c, [{
        field: 'recipients or items',
        message: 'Array cannot be empty',
        code: 'too_small',
      }]);
    }

    if (items.length > maxItems) {
      return ResponseBuilder.validationError(c, [{
        field: 'recipients or items',
        message: `Maximum ${maxItems} items allowed per request`,
        code: 'too_big',
      }]);
    }

    await next();
  };
};