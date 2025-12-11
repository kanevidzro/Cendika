import { z } from 'zod';

// Get status by ID schema
export const getSMSStatusSchema = z.object({
  id: z.string().min(1, 'Message ID is required'),
});

export type GetSMSStatusInput = z.infer<typeof getSMSStatusSchema>;

// Get status by batch ID schema
export const getBatchStatusSchema = z.object({
  batchId: z.string().min(1, 'Batch ID is required'),
});

export type GetBatchStatusInput = z.infer<typeof getBatchStatusSchema>;

// Webhook delivery status schema (for provider callbacks)
export const deliveryStatusWebhookSchema = z.object({
  messageId: z.string().optional(),
  providerId: z.string().optional(),
  status: z.enum(['SENT', 'DELIVERED', 'FAILED', 'EXPIRED']),
  timestamp: z.string().datetime().optional(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  networkCode: z.string().optional(),
});

export type DeliveryStatusWebhookInput = z.infer<typeof deliveryStatusWebhookSchema>;