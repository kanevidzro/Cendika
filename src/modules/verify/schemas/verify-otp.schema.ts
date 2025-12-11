import { z } from 'zod';
import { phoneSchema } from './send-otp.schema';

// OTP code validation
export const otpCodeSchema = z.string()
  .min(4, 'OTP code must be at least 4 characters')
  .max(10, 'OTP code must not exceed 10 characters')
  .regex(/^[A-Z0-9]+$/i, 'OTP code must be alphanumeric');

// Verify OTP schema
export const verifyOTPSchema = z.object({
  phone: phoneSchema,
  code: otpCodeSchema,
  metadata: z.record(z.any()).optional(),
});

export type VerifyOTPInput = z.infer<typeof verifyOTPSchema>;

// Resend OTP schema
export const resendOTPSchema = z.object({
  phone: phoneSchema,
});

export type ResendOTPInput = z.infer<typeof resendOTPSchema>;

// Check OTP status schema
export const checkOTPStatusSchema = z.object({
  phone: phoneSchema,
});

export type CheckOTPStatusInput = z.infer<typeof checkOTPStatusSchema>;