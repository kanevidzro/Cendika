import type { Context } from 'hono';
import { ResponseBuilder } from '@utils/api-response';
import { logger } from '@utils/logger';
import { SMSService } from '../services/sms.service';
import { SMSAnalyticsService } from '../services/sms-analytics.service';
import prisma from '@database/prisma.client';

export class SMSController {
  // Send SMS
  static async sendSMS(c: Context) {
    try {
      const accountId = c.get('accountId');
      const body = await c.req.json();

      const result = await SMSService.sendSMS(accountId, body);

      // Store actual cost in context for billing middleware
      c.set('actualCost', result.cost);
      c.set('serviceType', 'sms');

      return ResponseBuilder.success(
        c,
        result,
        'SMS queued for delivery',
        201
      );
    } catch (error: any) {
      logger.error({ error }, 'Send SMS controller error');
      return ResponseBuilder.error(
        c,
        'SMS_SEND_ERROR',
        error.message,
        400
      );
    }
  }

  // Get SMS by ID
  static async getSMS(c: Context) {
    try {
      const accountId = c.get('accountId');
      const { id } = c.req.param();

      const message = await prisma.message.findFirst({
        where: {
          id,
          accountId,
        },
        include: {
          sender: {
            select: {
              name: true,
              type: true,
            },
          },
        },
      });

      if (!message) {
        return ResponseBuilder.notFound(c, 'Message');
      }

      return ResponseBuilder.success(c, {
        id: message.id,
        to: message.recipient,
        from: message.senderName,
        message: message.content,
        status: message.status,
        provider: message.provider,
        providerId: message.providerId,
        cost: message.totalCost,
        currency: message.currency,
        units: message.units,
        sentAt: message.sentAt,
        deliveredAt: message.deliveredAt,
        failedAt: message.failedAt,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
      });
    } catch (error: any) {
      logger.error({ error }, 'Get SMS controller error');
      return ResponseBuilder.serverError(c);
    }
  }

  // Get SMS status
  static async getSMSStatus(c: Context) {
    try {
      const accountId = c.get('accountId');
      const { id } = c.req.param();

      const status = await SMSService.getSMSStatus(id, accountId);

      return ResponseBuilder.success(c, status);
    } catch (error: any) {
      logger.error({ error }, 'Get SMS status controller error');
      
      if (error.message === 'Message not found') {
        return ResponseBuilder.notFound(c, 'Message');
      }
      
      return ResponseBuilder.serverError(c);
    }
  }

  // List SMS messages
  static async listSMS(c: Context) {
    try {
      const accountId = c.get('accountId');
      const query = c.req.query();

      const page = parseInt(query.page || '1');
      const limit = parseInt(query.limit || '20');
      const skip = (page - 1) * limit;

      const where: any = {
        accountId,
        messageType: { in: ['SMS', 'BULK'] },
      };

      // Filter by status
      if (query.status) {
        where.status = query.status;
      }

      // Filter by recipient
      if (query.to) {
        where.recipient = { contains: query.to };
      }

      // Filter by sender ID
      if (query.senderId) {
        where.sender = {
          name: query.senderId,
        };
      }

      // Filter by date range
      if (query.startDate || query.endDate) {
        where.createdAt = {};
        if (query.startDate) {
          where.createdAt.gte = new Date(query.startDate);
        }
        if (query.endDate) {
          where.createdAt.lte = new Date(query.endDate);
        }
      }

      const [messages, total] = await Promise.all([
        prisma.message.findMany({
          where,
          take: limit,
          skip,
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            id: true,
            recipient: true,
            content: true,
            senderName: true,
            status: true,
            provider: true,
            totalCost: true,
            currency: true,
            units: true,
            createdAt: true,
            sentAt: true,
            deliveredAt: true,
          },
        }),
        prisma.message.count({ where }),
      ]);

      return ResponseBuilder.paginated(
        c,
        messages,
        page,
        limit,
        total
      );
    } catch (error: any) {
      logger.error({ error }, 'List SMS controller error');
      return ResponseBuilder.serverError(c);
    }
  }

  // Get SMS analytics
  static async getAnalytics(c: Context) {
    try {
      const accountId = c.get('accountId');
      const query = c.req.query();

      const startDate = query.startDate ? new Date(query.startDate) : undefined;
      const endDate = query.endDate ? new Date(query.endDate) : undefined;

      const analytics = await SMSAnalyticsService.getAccountAnalytics(
        accountId,
        startDate,
        endDate
      );

      return ResponseBuilder.success(c, analytics);
    } catch (error: any) {
      logger.error({ error }, 'Get analytics controller error');
      return ResponseBuilder.serverError(c);
    }
  }

  // Get SMS trends
  static async getTrends(c: Context) {
    try {
      const accountId = c.get('accountId');
      const query = c.req.query();
      const days = parseInt(query.days || '30');

      const trends = await SMSAnalyticsService.getSMSTrends(accountId, days);

      return ResponseBuilder.success(c, { trends });
    } catch (error: any) {
      logger.error({ error }, 'Get trends controller error');
      return ResponseBuilder.serverError(c);
    }
  }

  // Cancel scheduled SMS
  static async cancelSMS(c: Context) {
    try {
      const accountId = c.get('accountId');
      const { id } = c.req.param();

      const message = await prisma.message.findFirst({
        where: {
          id,
          accountId,
          status: 'PENDING',
        },
      });

      if (!message) {
        return ResponseBuilder.notFound(c, 'Scheduled message');
      }

      await prisma.message.update({
        where: { id },
        data: {
          status: 'FAILED',
          errorMessage: 'Cancelled by user',
          failedAt: new Date(),
        },
      });

      return ResponseBuilder.success(c, { id }, 'SMS cancelled successfully');
    } catch (error: any) {
      logger.error({ error }, 'Cancel SMS controller error');
      return ResponseBuilder.serverError(c);
    }
  }
}