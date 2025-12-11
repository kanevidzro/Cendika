import type { Context } from 'hono';
import { ResponseBuilder } from '@utils/api-response';
import { logger } from '@utils/logger';
import { VerificationService } from '../services/verification.service';
import { VerificationStorageService } from '../services/verification-storage.service';

export class VerifyController {
  // Request OTP
  static async requestOTP(c: Context) {
    try {
      const accountId = c.get('accountId');
      const body = await c.req.json();

      const result = await VerificationService.requestOTP(accountId, body);

      // Store actual cost in context for billing middleware
      c.set('actualCost', 0.03); // OTP cost
      c.set('serviceType', 'otp');

      return ResponseBuilder.created(
        c,
        {
          id: result.id,
          phone: result.phone,
          from: result.from,
          expiresAt: result.expiresAt,
          expiresIn: result.expiresIn,
          status: result.status,
        },
        'OTP sent successfully'
      );
    } catch (error: any) {
      logger.error({ error }, 'Request OTP controller error');
      
      if (error.message.includes('wait')) {
        return ResponseBuilder.error(
          c,
          'RATE_LIMIT_EXCEEDED',
          error.message,
          429
        );
      }

      return ResponseBuilder.error(
        c,
        'OTP_REQUEST_ERROR',
        error.message,
        400
      );
    }
  }

  // Verify OTP
  static async verifyOTP(c: Context) {
    try {
      const accountId = c.get('accountId');
      const body = await c.req.json();

      const result = await VerificationService.verifyOTP(accountId, body);

      if (!result.verified) {
        return ResponseBuilder.error(
          c,
          'VERIFICATION_FAILED',
          result.message,
          400,
          {
            attemptsLeft: result.attemptsLeft,
          }
        );
      }

      return ResponseBuilder.success(
        c,
        {
          phone: result.phone,
          verified: result.verified,
          message: result.message,
          metadata: result.metadata,
          verifiedAt: result.verifiedAt,
        },
        'OTP verified successfully'
      );
    } catch (error: any) {
      logger.error({ error }, 'Verify OTP controller error');
      return ResponseBuilder.error(
        c,
        'VERIFICATION_ERROR',
        error.message,
        400
      );
    }
  }

  // Resend OTP
  static async resendOTP(c: Context) {
    try {
      const accountId = c.get('accountId');
      const body = await c.req.json();

      const result = await VerificationService.resendOTP(accountId, body);

      // Store actual cost in context for billing middleware
      c.set('actualCost', 0.03); // OTP cost
      c.set('serviceType', 'otp');

      return ResponseBuilder.success(
        c,
        {
          id: result.id,
          phone: result.phone,
          from: result.from,
          expiresAt: result.expiresAt,
          expiresIn: result.expiresIn,
          message: result.message,
        },
        'OTP resent successfully'
      );
    } catch (error: any) {
      logger.error({ error }, 'Resend OTP controller error');

      if (error.message.includes('wait')) {
        return ResponseBuilder.error(
          c,
          'RATE_LIMIT_EXCEEDED',
          error.message,
          429
        );
      }

      return ResponseBuilder.error(
        c,
        'OTP_RESEND_ERROR',
        error.message,
        400
      );
    }
  }

  // Check OTP status
  static async checkStatus(c: Context) {
    try {
      const accountId = c.get('accountId');
      const { phone } = c.req.query();

      if (!phone) {
        return ResponseBuilder.error(
          c,
          'VALIDATION_ERROR',
          'Phone number is required',
          400
        );
      }

      const otp = await VerificationStorageService.getActiveOTP(accountId, phone);

      if (!otp) {
        return ResponseBuilder.success(c, {
          hasActiveOTP: false,
          message: 'No active OTP found',
        });
      }

      return ResponseBuilder.success(c, {
        hasActiveOTP: true,
        status: otp.status,
        expiresAt: otp.expiresAt,
        expiresIn: Math.max(0, Math.floor((otp.expiresAt.getTime() - Date.now()) / 1000)),
        attempts: otp.attempts,
        maxAttempts: otp.maxAttempts,
        attemptsLeft: otp.maxAttempts - otp.attempts,
      });
    } catch (error: any) {
      logger.error({ error }, 'Check status controller error');
      return ResponseBuilder.serverError(c);
    }
  }

  // Get OTP statistics
  static async getStatistics(c: Context) {
    try {
      const accountId = c.get('accountId');
      const query = c.req.query();

      const startDate = query.startDate ? new Date(query.startDate) : undefined;
      const endDate = query.endDate ? new Date(query.endDate) : undefined;

      const stats = await VerificationService.getStatistics(
        accountId,
        startDate,
        endDate
      );

      return ResponseBuilder.success(c, stats);
    } catch (error: any) {
      logger.error({ error }, 'Get statistics controller error');
      return ResponseBuilder.serverError(c);
    }
  }

  // Cleanup expired OTPs (internal/cron endpoint)
  static async cleanupExpired(c: Context) {
    try {
      // This should be protected by internal auth
      const count = await VerificationStorageService.cleanupExpiredOTPs();

      return ResponseBuilder.success(c, {
        cleaned: count,
        message: `${count} expired OTP${count !== 1 ? 's' : ''} cleaned up`,
      });
    } catch (error: any) {
      logger.error({ error }, 'Cleanup expired controller error');
      return ResponseBuilder.serverError(c);
    }
  }
}