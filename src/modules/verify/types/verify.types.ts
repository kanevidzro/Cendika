import type { OTPStatus } from '../../../../generated/prisma/client';

// PIN Types
export enum PinType {
  NUMERIC = 'NUMERIC',
  ALPHANUMERIC = 'ALPHANUMERIC',
  ALPHABETIC = 'ALPHABETIC',
}

// Duration types
export enum DurationType {
  SECONDS = 'seconds',
  MINUTES = 'minutes',
  HOURS = 'hours',
}

// OTP expiry configuration
export interface OTPExpiry {
  amount: number;
  duration: DurationType;
}

// OTP request
export interface OTPRequest {
  phone: string;
  from?: string;
  message?: string;
  pinLength?: number;
  pinType?: PinType;
  expiry?: OTPExpiry;
  maxAttempts?: number;
  metadata?: Record<string, any>;
}

// OTP verification request
export interface OTPVerifyRequest {
  phone: string;
  code: string;
  metadata?: Record<string, any>;
}

// OTP resend request
export interface OTPResendRequest {
  phone: string;
}

// OTP response
export interface OTPResponse {
  id: string;
  phone: string;
  from: string;
  expiresAt: Date;
  expiresIn: number;
  status: OTPStatus;
  message?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

// OTP verification response
export interface OTPVerifyResponse {
  success: boolean;
  phone: string;
  verified: boolean;
  attemptsLeft?: number;
  message: string;
  metadata?: Record<string, any>;
  verifiedAt?: Date;
}

// OTP resend response
export interface OTPResendResponse {
  id: string;
  phone: string;
  from: string;
  expiresAt: Date;
  expiresIn: number;
  message: string;
  cooldownEndsAt?: Date;
}

// OTP storage data
export interface OTPStorageData {
  id: string;
  phone: string;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
  status: OTPStatus;
  pinLength: number;
  pinType: PinType;
  senderId: string;
  message?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  lastAttemptAt?: Date;
  verifiedAt?: Date;
}

// OTP validation result
export interface OTPValidationResult {
  valid: boolean;
  error?: string;
  code?: string;
}

// Template variables
export interface TemplateVariables {
  code: string;
  amount?: number | string;
  duration?: string;
  [key: string]: any;
}

// OTP statistics
export interface OTPStatistics {
  totalSent: number;
  totalVerified: number;
  totalFailed: number;
  totalExpired: number;
  verificationRate: number;
  averageAttempts: number;
  cost: number;
  currency: string;
}

// Rate limit info
export interface RateLimitInfo {
  canSend: boolean;
  cooldownEndsAt?: Date;
  remainingSeconds?: number;
  reason?: string;
}