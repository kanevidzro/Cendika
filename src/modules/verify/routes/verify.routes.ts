import { Hono } from 'hono';
import { VerifyController } from '../controllers/verify.controller';
import {
  apiKeyAuth,
  rateLimit,
  requirePermissions,
  validate,
  checkBalance,
  deductBalance,
  auditLogger,
} from '@app/middleware';
import {
  sendOTPSchema,
} from '../schemas/send-otp.schema';

import { verifyOTPSchema,  resendOTPSchema,  } from '../schemas/verify-otp.schema';

const verifyRouter = new Hono();

// Apply authentication to all routes
verifyRouter.use('*', apiKeyAuth);

// Apply rate limiting (higher limit for OTP)
verifyRouter.use('*', rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: 'Too many OTP requests, please try again later',
}));

// ============================================
// OTP ROUTES
// ============================================

// Request OTP
verifyRouter.post(
  '/otp/request',
  requirePermissions('otp:send'),
  validate('json', sendOTPSchema),
  checkBalance(async () => ({
    estimatedCost: 0.03, // Fixed OTP cost
    currency: 'GHS',
  })),
  deductBalance,
  auditLogger('request', 'otp'),
  VerifyController.requestOTP
);

// Verify OTP
verifyRouter.post(
  '/otp/verify',
  requirePermissions('otp:verify'),
  validate('json', verifyOTPSchema),
  auditLogger('verify', 'otp'),
  VerifyController.verifyOTP
);

// Resend OTP
verifyRouter.post(
  '/otp/resend',
  requirePermissions('otp:send'),
  validate('json', resendOTPSchema),
  checkBalance(async () => ({
    estimatedCost: 0.03, // Fixed OTP cost
    currency: 'GHS',
  })),
  deductBalance,
  auditLogger('resend', 'otp'),
  VerifyController.resendOTP
);

// Check OTP status
verifyRouter.get(
  '/otp/status',
  requirePermissions('otp:verify'),
  VerifyController.checkStatus
);

// ============================================
// ANALYTICS ROUTES
// ============================================

// Get OTP statistics
verifyRouter.get(
  '/otp/analytics',
  requirePermissions('otp:analytics'),
  VerifyController.getStatistics
);

// ============================================
// ADMIN/CRON ROUTES
// ============================================

// Cleanup expired OTPs (internal use)
verifyRouter.post(
  '/otp/cleanup',
  // TODO: Add internal auth middleware
  VerifyController.cleanupExpired
);

export default verifyRouter;