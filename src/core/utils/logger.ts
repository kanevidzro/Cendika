import pino from 'pino';

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
          singleLine: false,
          hideObject: false,
          customColors: 'info:blue,warn:yellow,error:red',
        },
      }
    : undefined,
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    env: process.env.NODE_ENV,
    app: process.env.APP_NAME || 'AfriCom API',
    version: process.env.APP_VERSION || '1.0.0',
  },
});

// Helper functions for structured logging
export const logRequest = (method: string, url: string, duration: number, status: number) => {
  logger.info({
    type: 'request',
    method,
    url,
    duration: `${duration}ms`,
    status,
  }, `${method} ${url} - ${status} (${duration}ms)`);
};

export const logError = (error: Error, context?: Record<string, any>) => {
  logger.error({
    type: 'error',
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    ...context,
  }, error.message);
};

export const logSMS = (recipient: string, status: string, provider?: string) => {
  logger.info({
    type: 'sms',
    recipient,
    status,
    provider,
  }, `SMS ${status} to ${recipient}`);
};

export const logEmail = (to: string, status: string, subject?: string) => {
  logger.info({
    type: 'email',
    to,
    status,
    subject,
  }, `Email ${status} to ${to}`);
};

export const logVoice = (to: string, status: string, duration?: number) => {
  logger.info({
    type: 'voice',
    to,
    status,
    duration,
  }, `Voice call ${status} to ${to}`);
};

export const logBilling = (accountId: string, type: string, amount: number, currency: string) => {
  logger.info({
    type: 'billing',
    accountId,
    transactionType: type,
    amount,
    currency,
  }, `Billing: ${type} ${amount} ${currency} for account ${accountId}`);
};

export default logger;