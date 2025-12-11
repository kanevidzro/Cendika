import { z } from 'zod';

// Phone number validation (E.164 format - All African countries)
export const phoneSchema = z.string()
  .min(10, 'Phone number must be at least 10 characters')
  .max(15, 'Phone number must not exceed 15 characters')
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format. Use E.164 format (e.g., +233244123456, +234803123456)');

// Sender ID schema
export const senderIdSchema = z.string()
  .min(3, 'Sender ID must be at least 3 characters')
  .max(11, 'Sender ID must not exceed 11 characters')
  .regex(/^[a-zA-Z0-9]+$/, 'Sender ID must be alphanumeric only');

// PIN type schema
export const pinTypeSchema = z.enum(['NUMERIC', 'ALPHANUMERIC', 'ALPHABETIC'], {
  errorMap: () => ({ message: 'PIN type must be NUMERIC, ALPHANUMERIC, or ALPHABETIC' }),
});

// Duration type schema
export const durationTypeSchema = z.enum(['seconds', 'minutes', 'hours'], {
  errorMap: () => ({ message: 'Duration must be seconds, minutes, or hours' }),
});

// Expiry schema
export const expirySchema = z.object({
  amount: z.number()
    .int('Amount must be an integer')
    .min(1, 'Expiry amount must be at least 1')
    .max(24, 'Expiry amount cannot exceed 24 hours'),
  duration: durationTypeSchema,
}).refine((data) => {
  // Convert to minutes for validation
  let totalMinutes = data.amount;
  if (data.duration === 'seconds') {
    totalMinutes = data.amount / 60;
  } else if (data.duration === 'hours') {
    totalMinutes = data.amount * 60;
  }
  
  // Minimum 1 minute, maximum 24 hours (1440 minutes)
  return totalMinutes >= 1 && totalMinutes <= 1440;
}, {
  message: 'Expiry must be between 1 minute and 24 hours',
});

// Message template schema
export const messageTemplateSchema = z.string()
  .min(10, 'Message must be at least 10 characters')
  .max(300, 'Message must not exceed 300 characters')
  .refine((message) => message.includes('{code}'), {
    message: 'Message template must include {code} placeholder',
  });

// Send OTP schema
export const sendOTPSchema = z.object({
  phone: phoneSchema,
  from: senderIdSchema.optional(),
  message: messageTemplateSchema.optional().default(
    'Your verification code is {code}. It expires in {amount} {duration}.'
  ),
  pinLength: z.number()
    .int('PIN length must be an integer')
    .min(4, 'PIN length must be at least 4')
    .max(10, 'PIN length must not exceed 10')
    .optional()
    .default(6),
  pinType: pinTypeSchema.optional().default('NUMERIC'),
  expiry: expirySchema.optional().default({
    amount: 10,
    duration: 'minutes',
  }),
  maxAttempts: z.number()
    .int('Max attempts must be an integer')
    .min(1, 'Max attempts must be at least 1')
    .max(10, 'Max attempts cannot exceed 10')
    .optional()
    .default(3),
  metadata: z.record(z.any()).optional(),
});

export type SendOTPInput = z.infer<typeof sendOTPSchema>;