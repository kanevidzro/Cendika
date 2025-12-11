import type { Context } from 'hono';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
  timestamp: string;
  requestId?: string;
}

export class ResponseBuilder {
  static success<T>(
    c: Context,
    data: T,
    message?: string,
    statusCode: number = 200
  ) {
    const response: ApiResponse<T> = {
      success: true,
      message: message || 'Request successful',
      data,
      timestamp: new Date().toISOString(),
      requestId: c.get('requestId'),
    };
    return c.json(response, statusCode);
  }

  static error(
    c: Context,
    code: string,
    message: string,
    statusCode: number = 400,
    details?: any
  ) {
    const response: ApiResponse = {
      success: false,
      error: {
        code,
        message,
        details,
      },
      timestamp: new Date().toISOString(),
      requestId: c.get('requestId'),
    };
    return c.json(response, statusCode);
  }

  static paginated<T>(
    c: Context,
    data: T[],
    page: number,
    limit: number,
    total: number,
    message?: string
  ) {
    const totalPages = Math.ceil(total / limit);
    const response: ApiResponse<T[]> = {
      success: true,
      message: message || 'Request successful',
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
      timestamp: new Date().toISOString(),
      requestId: c.get('requestId'),
    };
    return c.json(response, 200);
  }

  static created<T>(c: Context, data: T, message?: string) {
    return this.success(c, data, message || 'Resource created successfully', 201);
  }

  static noContent(c: Context) {
    return c.body(null, 204);
  }

  static unauthorized(c: Context, message?: string) {
    return this.error(
      c,
      'UNAUTHORIZED',
      message || 'Authentication required',
      401
    );
  }

  static forbidden(c: Context, message?: string) {
    return this.error(
      c,
      'FORBIDDEN',
      message || 'Access denied',
      403
    );
  }

  static notFound(c: Context, resource?: string) {
    return this.error(
      c,
      'NOT_FOUND',
      `${resource || 'Resource'} not found`,
      404
    );
  }

  static validationError(c: Context, errors: any) {
    return this.error(
      c,
      'VALIDATION_ERROR',
      'Validation failed',
      422,
      errors
    );
  }

  static rateLimit(c: Context, retryAfter?: number) {
    const response = this.error(
      c,
      'RATE_LIMIT_EXCEEDED',
      'Too many requests',
      429
    );
    
    if (retryAfter) {
      c.header('Retry-After', retryAfter.toString());
    }
    
    return response;
  }

  static serverError(c: Context, message?: string, details?: any) {
    return this.error(
      c,
      'INTERNAL_SERVER_ERROR',
      message || 'An unexpected error occurred',
      500,
      process.env.NODE_ENV === 'development' ? details : undefined
    );
  }

  static insufficientBalance(c: Context, balance: number, required: number) {
    return this.error(
      c,
      'INSUFFICIENT_BALANCE',
      'Insufficient account balance',
      402,
      { balance, required }
    );
  }

  static serviceUnavailable(c: Context, service?: string) {
    return this.error(
      c,
      'SERVICE_UNAVAILABLE',
      `${service || 'Service'} is temporarily unavailable`,
      503
    );
  }
}

export default ResponseBuilder;