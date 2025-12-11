// Export all SMS module components

// Services
export { SMSService } from './services/sms.service';
export { SMSValidationService } from './services/sms-validation.service';
export { SMSRouterService } from './services/sms-router.service';
export { SMSAnalyticsService } from './services/sms-analytics.service';

// Controllers
export { SMSController } from './controllers/sms.controller';
export { BulkSMSController } from './controllers/bulk-sms.controller';

// Routes
export { default as smsRouter } from './routes/sms.routes';

// Types
export type {
  SMSMessage,
  SendSMSRequest,
  BulkSMSRequest,
  SMSResponse,
  BulkSMSResponse,
  SMSStatus,
  SMSAnalytics,
  SMSValidationResult,
  ProviderInfo,
  SMSPricing,
  MessageUnits,
} from './types/sms.types';

// Schemas
export {
  sendSMSSchema,
  querySMSSchema,
  getSMSSchema,
  phoneNumberSchema,
  senderIdSchema,
  messageSchema,
} from './schemas/send-sms.schema';

export {
  bulkSMSSchema,
  queryBulkSMSSchema,
} from './schemas/bulk-sms.schema';

export {
  getSMSStatusSchema,
  getBatchStatusSchema,
  deliveryStatusWebhookSchema,
} from './schemas/sms-status.schema';