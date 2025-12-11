import { logger } from '@utils/logger';
import prisma from '@database/prisma.client';
import { OTPService } from './otp.service';
import { VerificationStorageService } from './verification-storage.service';
import { SMSService } from '@modules/sms/services/sms.service';
import type {
  OTPRequest,
  OTPVerifyRequest,
  OTPResendRequest,
  OTPResponse,
  OTPVerifyResponse,
  OTPResendResponse,
  OTPStatistics,
} from '../types/verify.types';
import { OTPStatus } from '../../../../generated/prisma/client';

export class VerificationService {
  // Request OTP
  static async requestOTP(
    accountId: string,
    request: OTPRequest
  ): Promise<OTPResponse> {
    try {
      // Normalize phone number
      const phone = OTPService.normalizePhoneNumber(request.phone);

      // Check rate limit (30-second cooldown)
      const rateLimitInfo = await VerificationStorageService.checkRateLimit(
        accountId,
        phone,
        30
      );

      if (!rateLimitInfo.canSend) {
        throw new Error(rateLimitInfo.reason || 'Please wait before requesting another OTP');
      }

      // Invalidate any pending OTPs
      await VerificationStorageService.invalidatePendingOTPs(accountId, phone);

      // Generate OTP code
      const code = OTPService.generateCode(
        request.pinLength || 6,
        request.pinType || 'NUMERIC'
      );

      // Hash the code
      const codeHash = await OTPService.hashCode(code);

      // Calculate expiry
      const expiry = request.expiry || { amount: 10, duration: 'minutes' };
      const expiresAt = OTPService.calculateExpiry(expiry.amount, expiry.duration);

      // Get sender ID
      const senderId = await this.resolveSenderId(accountId, request.from);

      // Prepare message
      const message = request.message || OTPService.getDefaultMessage(
        code,
        expiry.amount,
        expiry.duration,
        senderId.name
      );

      // Replace template variables
      const finalMessage = OTPService.replaceTemplateVariables(message, {
        code,
        amount: expiry.amount,
        duration: OTPService.formatDuration(expiry.amount, expiry.duration),
      });

      // Store OTP in database
      const otpId = await VerificationStorageService.storeOTP({
        id: `${accountId}_${phone}`,
        phone,
        codeHash,
        expiresAt,
        maxAttempts: request.maxAttempts || 3,
        status: OTPStatus.PENDING,
        pinLength: request.pinLength || 6,
        pinType: request.pinType || 'NUMERIC',
        senderId: senderId.id,
        message: finalMessage,
        metadata: OTPService.sanitizeMetadata(request.metadata),
        createdAt: new Date(),
      });

      // Send SMS
      try {
        await SMSService.sendSMS(accountId, {
          to: phone,
          message: finalMessage,
          senderId: senderId.name,
          metadata: {
            type: 'otp',
            otpId,
            purpose: 'verification',
          },
        });
      } catch (smsError) {
        logger.error({ error: smsError, otpId }, 'Failed to send OTP SMS');
        // Mark OTP as failed
        await VerificationStorageService.markAsFailed(otpId);
        throw new Error('Failed to send OTP. Please try again.');
      }

      logger.info({
        otpId,
        phone: OTPService.maskPhoneNumber(phone),
        expiresIn: OTPService.getExpiryInSeconds(expiresAt),
      }, 'OTP sent successfully');

      return {
        id: otpId,
        phone,
        from: senderId.name,
        expiresAt,
        expiresIn: OTPService.getExpiryInSeconds(expiresAt),
        status: OTPStatus.PENDING,
        message: 'OTP sent successfully',
        metadata: request.metadata,
        createdAt: new Date(),
      };

    } catch (error: any) {
      logger.error({ error, accountId, phone: request.phone }, 'Request OTP error');
      throw error;
    }
  }

  // Verify OTP
  static async verifyOTP(
    accountId: string,
    request: OTPVerifyRequest
  ): Promise<OTPVerifyResponse> {
    try {
      // Normalize phone number
      const phone = OTPService.normalizePhoneNumber(request.phone);

      // Get active OTP
      const otp = await VerificationStorageService.getActiveOTP(accountId, phone);

      if (!otp) {
        logger.warn({ accountId, phone: OTPService.maskPhoneNumber(phone) }, 'No active OTP found');
        return {
          success: false,
          phone,
          verified: false,
          message: 'No active OTP found. Please request a new one.',
        };
      }

      // Check if expired
      if (OTPService.isExpired(otp.expiresAt)) {
        await VerificationStorageService.markAsExpired(otp.id);
        logger.warn({ otpId: otp.id }, 'OTP expired');
        return {
          success: false,
          phone,
          verified: false,
          message: 'OTP has expired. Please request a new one.',
        };
      }

      // Check if max attempts reached
      if (otp.attempts >= otp.maxAttempts) {
        await VerificationStorageService.markAsFailed(otp.id);
        logger.warn({ otpId: otp.id, attempts: otp.attempts }, 'Max attempts reached');
        return {
          success: false,
          phone,
          verified: false,
          message: 'Maximum verification attempts reached. Please request a new OTP.',
        };
      }

      // Verify the code
      const isValid = await OTPService.verifyCode(request.code.toUpperCase(), otp.codeHash);

      if (!isValid) {
        // Increment attempts
        const newAttempts = await VerificationStorageService.incrementAttempts(otp.id);
        const attemptsLeft = otp.maxAttempts - newAttempts;

        logger.warn({
          otpId: otp.id,
          attempts: newAttempts,
          attemptsLeft,
        }, 'Invalid OTP code');

        if (attemptsLeft <= 0) {
          await VerificationStorageService.markAsFailed(otp.id);
          return {
            success: false,
            phone,
            verified: false,
            message: 'Invalid code. Maximum attempts reached. Please request a new OTP.',
          };
        }

        return {
          success: false,
          phone,
          verified: false,
          attemptsLeft,
          message: `Invalid code. ${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining.`,
        };
      }

      // Mark as verified
      await VerificationStorageService.markAsVerified(otp.id);

      logger.info({
        otpId: otp.id,
        phone: OTPService.maskPhoneNumber(phone),
        attempts: otp.attempts + 1,
      }, 'OTP verified successfully');

      return {
        success: true,
        phone,
        verified: true,
        message: 'OTP verified successfully',
        metadata: otp.metadata,
        verifiedAt: new Date(),
      };

    } catch (error: any) {
      logger.error({ error, accountId, phone: request.phone }, 'Verify OTP error');
      throw error;
    }
  }

  // Resend OTP
  static async resendOTP(
    accountId: string,
    request: OTPResendRequest
  ): Promise<OTPResendResponse> {
    try {
      // Normalize phone number
      const phone = OTPService.normalizePhoneNumber(request.phone);

      // Check rate limit (30-second cooldown)
      const rateLimitInfo = await VerificationStorageService.checkRateLimit(
        accountId,
        phone,
        30
      );

      if (!rateLimitInfo.canSend) {
        logger.warn({
          accountId,
          phone: OTPService.maskPhoneNumber(phone),
          cooldownEndsAt: rateLimitInfo.cooldownEndsAt,
        }, 'Resend OTP rate limited');

        throw new Error(rateLimitInfo.reason || 'Please wait before resending OTP');
      }

      // Get the last OTP to maintain same configuration
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
        throw new Error('No previous OTP found. Please request a new one.');
      }

      // Invalidate previous OTPs
      await VerificationStorageService.invalidatePendingOTPs(accountId, phone);

      // Generate new code
      const code = OTPService.generateCode(lastOTP.codeLength, 'NUMERIC');
      const codeHash = await OTPService.hashCode(code);

      // Use same expiry duration as original
      const expiryMinutes = Math.round(
        (lastOTP.expiresAt.getTime() - lastOTP.createdAt.getTime()) / (1000 * 60)
      );
      const expiresAt = OTPService.calculateExpiry(expiryMinutes, 'minutes');

      // Get sender ID
      const senderId = await this.resolveSenderId(accountId, lastOTP.senderName);

      // Prepare message (same as original or default)
      const message = OTPService.getDefaultMessage(
        code,
        expiryMinutes,
        'minutes',
        senderId.name
      );

      // Store new OTP
      const otpId = await VerificationStorageService.storeOTP({
        id: `${accountId}_${phone}`,
        phone,
        codeHash,
        expiresAt,
        maxAttempts: lastOTP.maxAttempts,
        status: OTPStatus.PENDING,
        pinLength: lastOTP.codeLength,
        pinType: 'NUMERIC',
        senderId: senderId.id,
        message,
        metadata: lastOTP.metadata as Record<string, any> | undefined,
        createdAt: new Date(),
      });

      // Send SMS
      try {
        await SMSService.sendSMS(accountId, {
          to: phone,
          message,
          senderId: senderId.name,
          metadata: {
            type: 'otp_resend',
            otpId,
            purpose: 'verification',
          },
        });
      } catch (smsError) {
        logger.error({ error: smsError, otpId }, 'Failed to resend OTP SMS');
        await VerificationStorageService.markAsFailed(otpId);
        throw new Error('Failed to resend OTP. Please try again.');
      }

      logger.info({
        otpId,
        phone: OTPService.maskPhoneNumber(phone),
      }, 'OTP resent successfully');

      return {
        id: otpId,
        phone,
        from: senderId.name,
        expiresAt,
        expiresIn: OTPService.getExpiryInSeconds(expiresAt),
        message: 'OTP resent successfully',
        cooldownEndsAt: OTPService.generateCooldownTimestamp(30),
      };

    } catch (error: any) {
      logger.error({ error, accountId, phone: request.phone }, 'Resend OTP error');
      throw error;
    }
  }

  // Get OTP statistics
  static async getStatistics(
    accountId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<OTPStatistics> {
    try {
      const stats = await VerificationStorageService.getStatistics(
        accountId,
        startDate,
        endDate
      );

      // Calculate average attempts
      const verifiedOTPs = await prisma.otpMessage.findMany({
        where: {
          accountId,
          status: OTPStatus.VERIFIED,
          ...(startDate || endDate ? {
            createdAt: {
              ...(startDate && { gte: startDate }),
              ...(endDate && { lte: endDate }),
            },
          } : {}),
        },
        select: {
          attempts: true,
        },
      });

      const totalAttempts = verifiedOTPs.reduce((sum, otp) => sum + otp.attempts, 0);
      const averageAttempts = verifiedOTPs.length > 0
        ? totalAttempts / verifiedOTPs.length
        : 0;

      return {
        ...stats,
        averageAttempts: Math.round(averageAttempts * 100) / 100,
      };

    } catch (error: any) {
      logger.error({ error, accountId }, 'Get statistics error');
      throw error;
    }
  }

  // Resolve sender ID
  private static async resolveSenderId(
    accountId: string,
    requestedSenderId?: string
  ): Promise<{ id: string; name: string }> {
    if (requestedSenderId) {
      const senderId = await prisma.senderId.findFirst({
        where: {
          accountId,
          name: requestedSenderId,
          status: 'APPROVED',
          isActive: true,
        },
      });

      if (senderId) {
        return { id: senderId.id, name: senderId.name };
      }
    }

    // Get default sender ID
    const defaultSender = await prisma.senderId.findFirst({
      where: {
        accountId,
        status: 'APPROVED',
        isActive: true,
        isDefault: true,
      },
    });

    if (defaultSender) {
      return { id: defaultSender.id, name: defaultSender.name };
    }

    // Fallback to any approved sender
    const anySender = await prisma.senderId.findFirst({
      where: {
        accountId,
        status: 'APPROVED',
        isActive: true,
      },
    });

    if (anySender) {
      return { id: anySender.id, name: anySender.name };
    }

    // Use default brand name
    return { id: 'default', name: 'AfriCom' };
  }
}