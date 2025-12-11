import { logger } from '@utils/logger';
import prisma from '@database/prisma.client';
import type { OTPStorageData, RateLimitInfo } from '../types/verify.types';
import { OTPStatus } from '../../../../generated/prisma/client';

export class VerificationStorageService {
  // Store OTP
  static async storeOTP(data: Omit<OTPStorageData, 'attempts' | 'lastAttemptAt' | 'verifiedAt'>): Promise<string> {
    try {
      const otp = await prisma.otpMessage.create({
        data: {
          accountId: data.id.split('_')[0], // Extract account ID from composite ID
          recipient: data.phone,
          codeHash: data.codeHash,
          codeLength: data.pinLength,
          status: data.status,
          expiresAt: data.expiresAt,
          maxAttempts: data.maxAttempts,
          attempts: 0,
          senderId: data.senderId,
          senderName: data.senderId,
          cost: 0.03, // OTP cost (TODO: Get from pricing service)
          currency: 'GHS',
          purpose: 'verification',
          metadata: data.metadata,
        },
      });

      logger.info({
        otpId: otp.id,
        phone: this.maskPhone(data.phone),
      }, 'OTP stored');

      return otp.id;

    } catch (error) {
      logger.error({ error, phone: data.phone }, 'Failed to store OTP');
      throw error;
    }
  }

  // Get active OTP for phone
  static async getActiveOTP(accountId: string, phone: string): Promise<OTPStorageData | null> {
    try {
      const otp = await prisma.otpMessage.findFirst({
        where: {
          accountId,
          recipient: phone,
          status: OTPStatus.PENDING,
          expiresAt: {
            gt: new Date(),
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!otp) return null;

      return {
        id: otp.id,
        phone: otp.recipient,
        codeHash: otp.codeHash,
        expiresAt: otp.expiresAt,
        attempts: otp.attempts,
        maxAttempts: otp.maxAttempts,
        status: otp.status,
        pinLength: otp.codeLength,
        pinType: 'NUMERIC', // TODO: Store pin type in DB
        senderId: otp.senderName,
        metadata: otp.metadata as Record<string, any> | undefined,
        createdAt: otp.createdAt,
        verifiedAt: otp.verifiedAt || undefined,
      };

    } catch (error) {
      logger.error({ error, accountId, phone }, 'Failed to get active OTP');
      return null;
    }
  }

  // Update OTP attempts
  static async incrementAttempts(otpId: string): Promise<number> {
    try {
      const otp = await prisma.otpMessage.update({
        where: { id: otpId },
        data: {
          attempts: { increment: 1 },
          updatedAt: new Date(),
        },
      });

      return otp.attempts;

    } catch (error) {
      logger.error({ error, otpId }, 'Failed to increment attempts');
      throw error;
    }
  }

  // Mark OTP as verified
  static async markAsVerified(otpId: string): Promise<void> {
    try {
      await prisma.otpMessage.update({
        where: { id: otpId },
        data: {
          status: OTPStatus.VERIFIED,
          verifiedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      logger.info({ otpId }, 'OTP marked as verified');

    } catch (error) {
      logger.error({ error, otpId }, 'Failed to mark OTP as verified');
      throw error;
    }
  }

  // Mark OTP as failed
  static async markAsFailed(otpId: string): Promise<void> {
    try {
      await prisma.otpMessage.update({
        where: { id: otpId },
        data: {
          status: OTPStatus.FAILED,
          updatedAt: new Date(),
        },
      });

      logger.info({ otpId }, 'OTP marked as failed');

    } catch (error) {
      logger.error({ error, otpId }, 'Failed to mark OTP as failed');
      throw error;
    }
  }

  // Mark OTP as expired
  static async markAsExpired(otpId: string): Promise<void> {
    try {
      await prisma.otpMessage.update({
        where: { id: otpId },
        data: {
          status: OTPStatus.EXPIRED,
          updatedAt: new Date(),
        },
      });

      logger.info({ otpId }, 'OTP marked as expired');

    } catch (error) {
      logger.error({ error, otpId }, 'Failed to mark OTP as expired');
      throw error;
    }
  }

  // Invalidate all pending OTPs for phone
  static async invalidatePendingOTPs(accountId: string, phone: string): Promise<number> {
    try {
      const result = await prisma.otpMessage.updateMany({
        where: {
          accountId,
          recipient: phone,
          status: OTPStatus.PENDING,
        },
        data: {
          status: OTPStatus.EXPIRED,
          updatedAt: new Date(),
        },
      });

      logger.info({
        accountId,
        phone: this.maskPhone(phone),
        count: result.count,
      }, 'Pending OTPs invalidated');

      return result.count;

    } catch (error) {
      logger.error({ error, accountId, phone }, 'Failed to invalidate pending OTPs');
      throw error;
    }
  }

  // Check rate limit (cooldown)
  static async checkRateLimit(
    accountId: string,
    phone: string,
    cooldownSeconds: number = 30
  ): Promise<RateLimitInfo> {
    try {
      const lastOTP = await prisma.otpMessage.findFirst({
        where: {
          accountId,
          recipient: phone,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!lastOTP) {
        return { canSend: true };
      }

      const now = new Date();
      const lastSentAt = lastOTP.createdAt;
      const cooldownMs = cooldownSeconds * 1000;
      const elapsed = now.getTime() - lastSentAt.getTime();

      if (elapsed < cooldownMs) {
        const remainingMs = cooldownMs - elapsed;
        const remainingSeconds = Math.ceil(remainingMs / 1000);
        const cooldownEndsAt = new Date(lastSentAt.getTime() + cooldownMs);

        return {
          canSend: false,
          cooldownEndsAt,
          remainingSeconds,
          reason: `Please wait ${remainingSeconds} seconds before requesting another OTP`,
        };
      }

      return { canSend: true };

    } catch (error) {
      logger.error({ error, accountId, phone }, 'Rate limit check error');
      // Allow on error to not block legitimate requests
      return { canSend: true };
    }
  }

  // Get OTP statistics
  static async getStatistics(accountId: string, startDate?: Date, endDate?: Date) {
    try {
      const where: any = {
        accountId,
      };

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      const [totalSent, totalVerified, totalFailed, totalExpired, totalCost] = await Promise.all([
        prisma.otpMessage.count({ where }),
        prisma.otpMessage.count({
          where: { ...where, status: OTPStatus.VERIFIED },
        }),
        prisma.otpMessage.count({
          where: { ...where, status: OTPStatus.FAILED },
        }),
        prisma.otpMessage.count({
          where: { ...where, status: OTPStatus.EXPIRED },
        }),
        prisma.otpMessage.aggregate({
          where,
          _sum: { cost: true },
        }),
      ]);

      const verificationRate = totalSent > 0 ? (totalVerified / totalSent) * 100 : 0;

      return {
        totalSent,
        totalVerified,
        totalFailed,
        totalExpired,
        verificationRate: Math.round(verificationRate * 100) / 100,
        cost: totalCost._sum.cost || 0,
        currency: 'GHS',
      };

    } catch (error) {
      logger.error({ error, accountId }, 'Failed to get statistics');
      throw error;
    }
  }

  // Clean up expired OTPs (cron job)
  static async cleanupExpiredOTPs(): Promise<number> {
    try {
      const result = await prisma.otpMessage.updateMany({
        where: {
          status: OTPStatus.PENDING,
          expiresAt: {
            lt: new Date(),
          },
        },
        data: {
          status: OTPStatus.EXPIRED,
        },
      });

      if (result.count > 0) {
        logger.info({ count: result.count }, 'Expired OTPs cleaned up');
      }

      return result.count;

    } catch (error) {
      logger.error({ error }, 'Cleanup expired OTPs error');
      return 0;
    }
  }

  // Mask phone number for logging
  private static maskPhone(phone: string): string {
    if (phone.length <= 4) return '***';
    return phone.substring(0, 4) + '***' + phone.substring(phone.length - 3);
  }
}