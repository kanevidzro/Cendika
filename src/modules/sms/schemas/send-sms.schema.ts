import { z } from 'zod';

// Phone number validation schema
export const phoneNumberSchema = z.string()
  .min(10, 'Phone number must be at least 10 characters')
  .max(15, 'Phone number must not exceed 15 characters')
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format. Use E.164 format (e.g., +233244123456)');

// Sender ID validation schema
export const senderIdSchema = z.string()
  .min(3, 'Sender ID must be at least 3 characters')
  .max(11, 'Sender ID must not exceed 11 characters')
  .regex(/^[a-zA-Z0-9]+$/, 'Sender ID must be alphanumeric only');

// SMS message validation schema
export const messageSchema = z.string()
  .min(1, 'Message cannot be empty')
  .max(1600, 'Message exceeds maximum length of 1600 characters');

// Send SMS schema
export const sendSMSSchema = z.object({
  to: phoneNumberSchema,
  message: messageSchema,
  senderId: senderIdSchema.optional(),
  scheduledFor: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
  metadata: z.record(z.any()).optional(),
  tags: z.array(z.string()).optional(),
});

export type SendSMSInput = z.infer<typeof sendSMSSchema>;

// Query SMS schema
export const querySMSSchema = z.object({
  status: z.enum(['PENDING', 'QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'EXPIRED']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.string().optional().transform(v => v ? parseInt(v) : 1),
  limit: z.string().optional().transform(v => v ? parseInt(v) : 20),
  to: phoneNumberSchema.optional(),
  senderId: z.string().optional(),
});

export type QuerySMSInput = z.infer<typeof querySMSSchema>;

// Get SMS by ID schema
export const getSMSSchema = z.object({
  id: z.string().min(1, 'Message ID is required'),
});

export type GetSMSInput = z.infer<typeof getSMSSchema>;