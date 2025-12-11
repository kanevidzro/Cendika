import { Hono } from 'hono';
import { SMSController } from '../controllers/sms.controller';
import { BulkSMSController } from '../controllers/bulk-sms.controller';
import {
  apiKeyAuth,
  smsRateLimit,
  requirePermissions,
  validate,
  checkBalance,
  checkLimits,
  deductBalance,
  auditLogger,
} from '@app/middleware';
import {
  sendSMSSchema,
  querySMSSchema,
  getSMSSchema,
} from '../schemas/send-sms.schema';
import { bulkSMSSchema } from '../schemas/bulk-sms.schema'
import { SMSValidationService } from '../services/sms-validation.service';
import { SMSRouterService } from '../services/sms-router.service';
import type { Context } from 'hono';

const smsRouter = new Hono();

// Apply authentication to all routes
smsRouter.use('*', apiKeyAuth);

// Apply SMS rate limiting
smsRouter.use('*', smsRateLimit);

// ============================================
// SINGLE SMS ROUTES
// ============================================

// Send SMS
smsRouter.post(
  '/send',
  requirePermissions('sms:send'),
  validate('json', sendSMSSchema),
  checkLimits('sms'),
  checkBalance(async (c: Context) => {
    const body = await c.req.json();
    
    // Calculate message units
    const messageUnits = SMSValidationService.calculateMessageUnits(body.message);
    
    // Get routing info for cost estimation
    const validation = SMSValidationService.validatePhoneNumber(body.to);
    const pricing = await SMSRouterService.getPricing(
      SMSRouterService.getCountryFromPhone(validation.formatted),
      undefined,
      'SMS',
      messageUnits.units
    );
    
    return {
      estimatedCost: pricing.totalCost,
      currency: pricing.currency,
      units: messageUnits.units,
    };
  }),
  deductBalance,
  auditLogger('send', 'sms'),
  SMSController.sendSMS
);

// Get SMS by ID
smsRouter.get(
  '/:id',
  validate('param', getSMSSchema),
  SMSController.getSMS
);

// Get SMS status
smsRouter.get(
  '/:id/status',
  validate('param', getSMSSchema),
  SMSController.getSMSStatus
);

// List SMS messages
smsRouter.get(
  '/',
  validate('query', querySMSSchema),
  SMSController.listSMS
);

// Cancel scheduled SMS
smsRouter.delete(
  '/:id',
  requirePermissions('sms:send'),
  validate('param', getSMSSchema),
  auditLogger('cancel', 'sms'),
  SMSController.cancelSMS
);

// ============================================
// BULK SMS ROUTES
// ============================================

// Send bulk SMS
smsRouter.post(
  '/bulk/send',
  requirePermissions('sms:send', 'sms:bulk'),
  validate('json', bulkSMSSchema),
  checkLimits('sms'),
  checkBalance(async (c: Context) => {
    const body = await c.req.json();
    
    // Estimate total cost for all recipients
    let totalCost = 0;
    
    for (const recipient of body.recipients) {
      const message = recipient.message || body.message || '';
      const messageUnits = SMSValidationService.calculateMessageUnits(message);
      
      const validation = SMSValidationService.validatePhoneNumber(recipient.to);
      if (validation.valid) {
        const pricing = await SMSRouterService.getPricing(
          SMSRouterService.getCountryFromPhone(validation.formatted),
          undefined,
          'BULK',
          messageUnits.units
        );
        totalCost += pricing.totalCost;
      }
    }
    
    return {
      estimatedCost: totalCost,
      currency: 'GHS',
    };
  }),
  deductBalance,
  auditLogger('send_bulk', 'sms'),
  BulkSMSController.sendBulkSMS
);

// Get batch status
smsRouter.get(
  '/bulk/batch/:batchId',
  BulkSMSController.getBatchStatus
);

// List batches
smsRouter.get(
  '/bulk/batches',
  BulkSMSController.listBatches
);

// Export batch results
smsRouter.get(
  '/bulk/batch/:batchId/export',
  BulkSMSController.exportBatch
);

// ============================================
// ANALYTICS ROUTES
// ============================================

// Get SMS analytics
smsRouter.get(
  '/analytics/overview',
  requirePermissions('sms:analytics'),
  SMSController.getAnalytics
);

// Get SMS trends
smsRouter.get(
  '/analytics/trends',
  requirePermissions('sms:analytics'),
  SMSController.getTrends
);

export default smsRouter;