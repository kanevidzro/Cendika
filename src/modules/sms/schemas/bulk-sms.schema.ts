import { z } from 'zod';
import { phoneNumberSchema, senderIdSchema, messageSchema } from './send-sms.schema';

// Single recipient schema
const recipientSchema = z.object({
  to: phoneNumberSchema,
  message: messageSchema.optional(),
  variables: z.record(z.string()).optional(),
});

// Bulk SMS schema
export const bulkSMSSchema = z.object({
  recipients: z.array(recipientSchema)
    .min(1, 'At least one recipient is required')
    .max(10000, 'Maximum 10,000 recipients per batch'),
  message: messageSchema.optional(),
  senderId: senderIdSchema.optional(),
  scheduledFor: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
  metadata: z.record(z.any()).optional(),
  tags: z.array(z.string()).optional(),
}).refine(
  (data) => {
    // Either message must be provided at root level or for each recipient
    if (!data.message) {
      return data.recipients.every(r => r.message);
    }
    return true;
  },
  {
    message: 'Either provide a default message or a message for each recipient',
  }
);

export type BulkSMSInput = z.infer<typeof bulkSMSSchema>;

// Query bulk SMS schema
export const queryBulkSMSSchema = z.object({
  batchId: z.string().optional(),
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.string().optional().transform(v => v ? parseInt(v) : 1),
  limit: z.string().optional().transform(v => v ? parseInt(v) : 20),
});

export type QueryBulkSMSInput = z.infer<typeof queryBulkSMSSchema>;