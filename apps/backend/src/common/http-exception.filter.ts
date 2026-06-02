import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import type { Logger } from 'winston';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/nestjs';
import { MetricsService } from '../observability/metrics/metrics.service';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly metrics: MetricsService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const correlationId = request.headers['x-correlation-id'] as
      | string
      | undefined;

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error';

    const isDev = process.env.NODE_ENV !== 'production';

    const logPayload = {
      correlationId,
      method: request.method,
      url: request.url,
      statusCode: status,
      error: exception instanceof Error ? exception.message : String(exception),
      ...(isDev && exception instanceof Error
        ? { stack: exception.stack }
        : {}),
    };

    if (status >= 500) {
      Sentry.captureException(exception);
      this.logger.error('http_exception', logPayload);
    } else if (status === 401) {
      this.metrics.authFailuresTotal.labels('unauthorized').inc();
      this.logger.warn('security_event', logPayload);
    } else if (status === 403) {
      this.metrics.authFailuresTotal.labels('forbidden').inc();
      this.logger.warn('security_event', logPayload);
    } else {
      this.logger.warn('http_exception', logPayload);
    }

    response.status(status).json({
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
