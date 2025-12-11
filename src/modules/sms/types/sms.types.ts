import type { MessageStatus, MessageType } from '../../../../generated/prisma/client';

// SMS Message interface
export interface SMSMessage {
  id: string;
  to: string;
  message: string;
  from?: string;
  senderId?: string;
  scheduledFor?: Date;
}

// SMS Send request
export interface SendSMSRequest {
  to: string;
  message: string;
  senderId?: string;
  scheduledFor?: Date;
  metadata?: Record<string, any>;
  tags?: string[];
}

// Bulk SMS request
export interface BulkSMSRequest {
  recipients: Array<{
    to: string;
    message?: string;
    variables?: Record<string, string>;
  }>;
  message?: string; // Default message if not provided per recipient
  senderId?: string;
  scheduledFor?: Date;
  metadata?: Record<string, any>;
  tags?: string[];
}

// SMS Response
export interface SMSResponse {
  id: string;
  to: string;
  from: string;
  message: string;
  status: MessageStatus;
  provider?: string;
  providerId?: string;
  cost: number;
  currency: string;
  units: number;
  scheduledFor?: Date;
  createdAt: Date;
}

// Bulk SMS Response
export interface BulkSMSResponse {
  batchId: string;
  totalRecipients: number;
  accepted: number;
  rejected: number;
  estimatedCost: number;
  currency: string;
  messages: Array<{
    id: string;
    to: string;
    status: 'accepted' | 'rejected';
    error?: string;
  }>;
}

// SMS Status
export interface SMSStatus {
  id: string;
  to: string;
  status: MessageStatus;
  provider?: string;
  providerId?: string;
  sentAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  errorCode?: string;
  errorMessage?: string;
}

// Provider response interface
export interface ProviderSMSResponse {
  success: boolean;
  providerId?: string;
  providerStatus?: string;
  providerMessage?: string;
  error?: string;
  cost?: number;
}

// SMS Analytics
export interface SMSAnalytics {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  totalPending: number;
  deliveryRate: number;
  totalCost: number;
  currency: string;
  byNetwork?: Record<string, {
    sent: number;
    delivered: number;
    failed: number;
    cost: number;
  }>;
  byProvider?: Record<string, {
    sent: number;
    delivered: number;
    failed: number;
    cost: number;
  }>;
}

// SMS Validation result
export interface SMSValidationResult {
  valid: boolean;
  phone: string;
  formatted: string;
  country?: string;
  countryCode?: string;
  network?: string;
  operator?: string;
  type?: 'mobile' | 'landline' | 'unknown';
  errors?: string[];
}

// Provider selection criteria
export interface ProviderSelectionCriteria {
  country: string;
  network?: string;
  messageType: MessageType;
  priority?: 'cost' | 'speed' | 'reliability';
}

// Provider info
export interface ProviderInfo {
  id: string;
  name: string;
  type: string;
  countries: string[];
  networks: string[];
  priority: number;
  successRate?: number;
  avgLatency?: number;
  costPerUnit: number;
}

// SMS pricing
export interface SMSPricing {
  country: string;
  network?: string;
  ratePerUnit: number;
  currency: string;
  units: number;
  totalCost: number;
}

// Message units calculation
export interface MessageUnits {
  messageLength: number;
  units: number;
  encoding: 'GSM-7' | 'UCS-2';
  charactersPerUnit: number;
}