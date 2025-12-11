import type { Context } from 'hono';
import { ResponseBuilder } from '@utils/api-response';
import { logger } from '@utils/logger';
import { SMSService } from '../services/sms.service';
import { prisma } from '@/core/database/prisma.client';

export class BulkSMSController {
  // Send bulk SMS
  static async sendBulkSMS(c: Context) {
    try {
      const accountId = c.get('accountId');
      const body = await c.req.json();

      // Validate maximum recipients
      if (body.recipients && body.recipients.length > 10000) {
        return ResponseBuilder.error(
          c,
          'BULK_LIMIT_EXCEEDED',
          'Maximum 10,000 recipients per batch',
          400
        );
      }

      const result = await SMSService.sendBulkSMS(accountId, body);

      // Store actual cost in context for billing middleware
      c.set('actualCost', result.estimatedCost);
      c.set('serviceType', 'sms');

      return ResponseBuilder.success(
        c,
        result,
        `Bulk SMS processed. ${result.accepted} accepted, ${result.rejected} rejected`,
        201
      );
    } catch (error: any) {
      logger.error({ error }, 'Send bulk SMS controller error');
      return ResponseBuilder.error(
        c,
        'BULK_SMS_ERROR',
        error.message,
        400
      );
    }
  }

  // Get batch status
  static async getBatchStatus(c: Context) {
    try {
      const accountId = c.get('accountId');
      const { batchId } = c.req.param();

      const result = await SMSService.getBatchMessages(batchId, accountId);

      if (result.messages.length === 0) {
        return ResponseBuilder.notFound(c, 'Batch');
      }

      return ResponseBuilder.success(c, result);
    } catch (error: any) {
      logger.error({ error }, 'Get batch status controller error');
      return ResponseBuilder.serverError(c);
    }
  }

  // List batches
  static async listBatches(c: Context) {
    try {
      const accountId = c.get('accountId');
      const query = c.req.query();

      const page = parseInt(query.page || '1');
      const limit = parseInt(query.limit || '20');
      const skip = (page - 1) * limit;

      // Get unique batch IDs with message counts
      const batches = await prisma.$queryRaw`
        SELECT 
          "batchId",
          COUNT(*) as total,
          SUM(CASE WHEN status = 'DELIVERED' THEN 1 ELSE 0 END) as delivered,
          SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed,
          SUM(CASE WHEN status IN ('PENDING', 'QUEUED', 'SENT') THEN 1 ELSE 0 END) as pending,
          SUM("totalCost") as "totalCost",
          MIN("createdAt") as "createdAt"
        FROM messages
        WHERE "accountId" = ${accountId}
          AND "batchId" IS NOT NULL
        GROUP BY "batchId"
        ORDER BY "createdAt" DESC
        LIMIT ${limit}
        OFFSET ${skip}
      `;

      const totalBatches = await prisma.$queryRaw`
        SELECT COUNT(DISTINCT "batchId") as count
        FROM messages
        WHERE "accountId" = ${accountId}
          AND "batchId" IS NOT NULL
      `;

      return ResponseBuilder.paginated(
        c,
        batches,
        page,
        limit,
        Number((totalBatches as any[])[0]?.count || 0)
      );
    } catch (error: any) {
      logger.error({ error }, 'List batches controller error');
      return ResponseBuilder.serverError(c);
    }
  }

  // Export batch results
  static async exportBatch(c: Context) {
    try {
      const accountId = c.get('accountId');
      const { batchId } = c.req.param();
      const format = c.req.query('format') || 'json';

      const result = await SMSService.getBatchMessages(batchId, accountId);

      if (result.messages.length === 0) {
        return ResponseBuilder.notFound(c, 'Batch');
      }

      if (format === 'csv') {
        // Generate CSV
        const csv = [
          ['ID', 'Recipient', 'Status', 'Cost', 'Created At'].join(','),
          ...result.messages.map(m => 
            [m.id, m.to, m.status, m.cost, m.createdAt].join(',')
          ),
        ].join('\n');

        c.header('Content-Type', 'text/csv');
        c.header('Content-Disposition', `attachment; filename="batch-${batchId}.csv"`);
        return c.body(csv);
      }

      return ResponseBuilder.success(c, result);
    } catch (error: any) {
      logger.error({ error }, 'Export batch controller error');
      return ResponseBuilder.serverError(c);
    }
  }
}