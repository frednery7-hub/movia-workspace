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
import { getCorrelationId } from '../observability/context/request-context';
import { AppException } from './app.exception';
import { defaultCodeForStatus, type ErrorEnvelope } from './error-codes';

type RequestWithUser = Request & {
  user?: {
    sub?: string;
    deviceId?: string;
  };
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly metrics: MetricsService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithUser>();
    // Prefere o contexto assíncrono; cai para o header se o erro ocorrer
    // fora do escopo do interceptor (ex.: falha no próprio middleware).
    const correlationId =
      getCorrelationId() ??
      (request.headers['x-correlation-id'] as string | undefined);

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error';

    const isDev = process.env.NODE_ENV === 'development';

    const logPayload = {
      correlationId,
      method: request.method,
      url: request.url,
      route: (request.route as { path?: string } | undefined)?.path,
      ip: request.ip,
      deviceId:
        request.user?.deviceId ?? request.headers['x-device-id'] ?? undefined,
      userId: request.user?.sub,
      userAgent: request.headers['user-agent'],
      timestamp: new Date().toISOString(),
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
    } else if (status === 429) {
      this.logger.warn('rate_limit_event', logPayload);
    } else if (status === 400 && isSensitiveRoute(request.url)) {
      this.logger.warn('sensitive_bad_request', logPayload);
    } else {
      this.logger.warn('http_exception', logPayload);
    }

    // Envelope estável: o cliente reage ao `code`, nunca à `message`.
    // O correlationId permite ao usuário citar um id que cruza com os logs.
    const envelope: ErrorEnvelope = {
      code:
        exception instanceof AppException
          ? exception.code
          : defaultCodeForStatus(status),
      message,
      statusCode: status,
      path: request.url,
      timestamp: new Date().toISOString(),
      ...(correlationId ? { correlationId } : {}),
    };

    response.status(status).json(envelope);
  }
}

function isSensitiveRoute(url: string): boolean {
  return (
    url.includes('/auth/') || url.includes('/geo/') || url.includes('/eta/')
  );
}
