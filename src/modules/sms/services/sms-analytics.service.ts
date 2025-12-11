import { logger } from '@utils/logger';
import prisma from '@database/prisma.client';
import type { SMSAnalytics } from '../types/sms.types';
import { MessageStatus } from '../../../../generated/prisma/client';

export class SMSAnalyticsService {
  // Get SMS analytics for account
  static async getAccountAnalytics(
    accountId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<SMSAnalytics> {
    try {
      const whereClause: any = {
        accountId,
        messageType: { in: ['SMS', 'BULK'] },
      };

      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) whereClause.createdAt.gte = startDate;
        if (endDate) whereClause.createdAt.lte = endDate;
      }

      // Get message counts by status
      const [
        totalSent,
        totalDelivered,
        totalFailed,
        totalPending,
        totalCost,
      ] = await Promise.all([
        // Total sent (includes delivered and failed)
        prisma.message.count({
          where: {
            ...whereClause,
            status: { in: ['SENT', 'DELIVERED', 'FAILED'] },
          },
        }),
        
        // Total delivered
        prisma.message.count({
          where: {
            ...whereClause,
            status: 'DELIVERED',
          },
        }),
        
        // Total failed
        prisma.message.count({
          where: {
            ...whereClause,
            status: 'FAILED',
          },
        }),
        
        // Total pending
        prisma.message.count({
          where: {
            ...whereClause,
            status: { in: ['PENDING', 'QUEUED'] },
          },
        }),
        
        // Total cost
        prisma.message.aggregate({
          where: whereClause,
          _sum: {
            totalCost: true,
          },
        }),
      ]);

      // Calculate delivery rate
      const deliveryRate = totalSent > 0 
        ? (totalDelivered / totalSent) * 100 
        : 0;

      // Get stats by network
      const networkStats = await this.getStatsByNetwork(accountId, startDate, endDate);

      // Get stats by provider
      const providerStats = await this.getStatsByProvider(accountId, startDate, endDate);

      return {
        totalSent,
        totalDelivered,
        totalFailed,
        totalPending,
        deliveryRate: Math.round(deliveryRate * 100) / 100,
        totalCost: totalCost._sum.totalCost || 0,
        currency: 'GHS', // TODO: Get from account
        byNetwork: networkStats,
        byProvider: providerStats,
      };

    } catch (error) {
      logger.error({ error, accountId }, 'Analytics generation error');
      throw error;
    }
  }

  // Get statistics by network
  private static async getStatsByNetwork(
    accountId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<Record<string, any>> {
    try {
      const whereClause: any = {
        accountId,
        messageType: { in: ['SMS', 'BULK'] },
        recipientNetwork: { not: null },
      };

      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) whereClause.createdAt.gte = startDate;
        if (endDate) whereClause.createdAt.lte = endDate;
      }

      const messages = await prisma.message.groupBy({
        by: ['recipientNetwork', 'status'],
        where: whereClause,
        _count: true,
        _sum: {
          totalCost: true,
        },
      });

      const networkStats: Record<string, any> = {};

      for (const msg of messages) {
        const network = msg.recipientNetwork || 'unknown';
        
        if (!networkStats[network]) {
          networkStats[network] = {
            sent: 0,
            delivered: 0,
            failed: 0,
            cost: 0,
          };
        }

        if (msg.status === 'SENT' || msg.status === 'DELIVERED' || msg.status === 'FAILED') {
          networkStats[network].sent += msg._count;
        }
        if (msg.status === 'DELIVERED') {
          networkStats[network].delivered += msg._count;
        }
        if (msg.status === 'FAILED') {
          networkStats[network].failed += msg._count;
        }
        networkStats[network].cost += msg._sum.totalCost || 0;
      }

      return networkStats;

    } catch (error) {
      logger.error({ error, accountId }, 'Network stats error');
      return {};
    }
  }

  // Get statistics by provider
  private static async getStatsByProvider(
    accountId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<Record<string, any>> {
    try {
      const whereClause: any = {
        accountId,
        messageType: { in: ['SMS', 'BULK'] },
        provider: { not: null },
      };

      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) whereClause.createdAt.gte = startDate;
        if (endDate) whereClause.createdAt.lte = endDate;
      }

      const messages = await prisma.message.groupBy({
        by: ['provider', 'status'],
        where: whereClause,
        _count: true,
        _sum: {
          totalCost: true,
        },
      });

      const providerStats: Record<string, any> = {};

      for (const msg of messages) {
        const provider = msg.provider || 'unknown';
        
        if (!providerStats[provider]) {
          providerStats[provider] = {
            sent: 0,
            delivered: 0,
            failed: 0,
            cost: 0,
          };
        }

        if (msg.status === 'SENT' || msg.status === 'DELIVERED' || msg.status === 'FAILED') {
          providerStats[provider].sent += msg._count;
        }
        if (msg.status === 'DELIVERED') {
          providerStats[provider].delivered += msg._count;
        }
        if (msg.status === 'FAILED') {
          providerStats[provider].failed += msg._count;
        }
        providerStats[provider].cost += msg._sum.totalCost || 0;
      }

      return providerStats;

    } catch (error) {
      logger.error({ error, accountId }, 'Provider stats error');
      return {};
    }
  }

  // Get daily SMS statistics
  static async getDailyStats(
    accountId: string,
    date?: Date
  ): Promise<any> {
    try {
      const targetDate = date || new Date();
      targetDate.setHours(0, 0, 0, 0);

      const stats = await prisma.dailyStats.findUnique({
        where: {
          accountId_date: {
            accountId,
            date: targetDate,
          },
        },
      });

      if (!stats) {
        // Return default stats if not found
        return {
          date: targetDate,
          smsSent: 0,
          smsDelivered: 0,
          smsFailed: 0,
          smsCost: 0,
        };
      }

      return {
        date: stats.date,
        smsSent: stats.smsSent,
        smsDelivered: stats.smsDelivered,
        smsFailed: stats.smsFailed,
        smsCost: stats.smsCost,
      };

    } catch (error) {
      logger.error({ error, accountId, date }, 'Daily stats error');
      throw error;
    }
  }

  // Update daily statistics
  static async updateDailyStats(
    accountId: string,
    status: MessageStatus,
    cost: number,
    date?: Date
  ): Promise<void> {
    try {
      const targetDate = date || new Date();
      targetDate.setHours(0, 0, 0, 0);

      const updateData: any = {};

      // Increment appropriate counters
      if (status === 'SENT' || status === 'DELIVERED') {
        updateData.smsSent = { increment: 1 };
      }
      if (status === 'DELIVERED') {
        updateData.smsDelivered = { increment: 1 };
      }
      if (status === 'FAILED') {
        updateData.smsFailed = { increment: 1 };
      }
      updateData.smsCost = { increment: cost };

      await prisma.dailyStats.upsert({
        where: {
          accountId_date: {
            accountId,
            date: targetDate,
          },
        },
        update: updateData,
        create: {
          accountId,
          date: targetDate,
          smsSent: status === 'SENT' || status === 'DELIVERED' ? 1 : 0,
          smsDelivered: status === 'DELIVERED' ? 1 : 0,
          smsFailed: status === 'FAILED' ? 1 : 0,
          smsCost: cost,
        },
      });

      logger.debug({ accountId, status, cost }, 'Daily stats updated');

    } catch (error) {
      logger.error({ error, accountId }, 'Failed to update daily stats');
    }
  }

  // Get SMS trends
  static async getSMSTrends(
    accountId: string,
    days: number = 30
  ): Promise<Array<{
    date: Date;
    sent: number;
    delivered: number;
    failed: number;
    cost: number;
  }>> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      const stats = await prisma.dailyStats.findMany({
        where: {
          accountId,
          date: {
            gte: startDate,
          },
        },
        orderBy: {
          date: 'asc',
        },
        select: {
          date: true,
          smsSent: true,
          smsDelivered: true,
          smsFailed: true,
          smsCost: true,
        },
      });

      return stats.map(s => ({
        date: s.date,
        sent: s.smsSent,
        delivered: s.smsDelivered,
        failed: s.smsFailed,
        cost: s.smsCost,
      }));

    } catch (error) {
      logger.error({ error, accountId, days }, 'SMS trends error');
      throw error;
    }
  }
}