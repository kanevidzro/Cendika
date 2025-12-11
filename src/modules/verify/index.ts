// Export all Verify module components

// Services
export { OTPService } from './services/otp.service';
export { VerificationService } from './services/verification.service';
export { VerificationStorageService } from './services/verification-storage.service';

// Controllers
export { VerifyController } from './controllers/verify.controller';

// Routes
export { default as verifyRouter } from './routes/verify.routes';

// Types
export type {
  OTPRequest,
  OTPVerifyRequest,
  OTPResendRequest,
  OTPResponse,
  OTPVerifyResponse,
  OTPResendResponse,
  OTPStatistics,
  OTPStorageData,
  TemplateVariables,
  RateLimitInfo,
} from './types/verify.types';

export { PinType, DurationType } from './types/verify.types';

// Schemas
export {
  sendOTPSchema,
  phoneSchema,
  senderIdSchema,
  pinTypeSchema,
  expirySchema,
  messageTemplateSchema,
} from './schemas/send-otp.schema';

export {
  verifyOTPSchema,
  resendOTPSchema,
  checkOTPStatusSchema,
  otpCodeSchema,
} from './schemas/verify-otp.schema';