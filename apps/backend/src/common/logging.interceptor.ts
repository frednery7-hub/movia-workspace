import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  HttpException,
} from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import type { Logger } from 'winston';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';
import * as crypto from 'crypto';
import { MetricsService } from '../observability/metrics/metrics.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly metrics: MetricsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const correlationId = crypto.randomBytes(8).toString('hex');
    const startMs = Date.now();
    const method = req.method;
    const url = req.url;
    const route = (req.route as { path?: string } | undefined)?.path ?? url;

    req.headers['x-correlation-id'] = correlationId;

    return next.handle().pipe(
      tap({
        next: () => {
          const ms = Date.now() - startMs;
          const res = context.switchToHttp().getResponse<Response>();
          const status = String(res.statusCode);

          res.setHeader('x-correlation-id', correlationId);

          this.logger.info('http_request', {
            correlationId,
            method,
            url,
            route,
            statusCode: res.statusCode,
            durationMs: ms,
          });

          this.metrics.httpRequestDuration
            .labels(method, route, status)
            .observe(ms);
        },
        error: (err: Error) => {
          const ms = Date.now() - startMs;
          const statusCode =
            err instanceof HttpException ? err.getStatus() : 500;
          const logPayload = {
            correlationId,
            method,
            url,
            durationMs: ms,
            error: err.message,
            statusCode,
          };

          if (statusCode >= 500) {
            this.logger.error('http_request_error', logPayload);
          } else {
            this.logger.warn('http_request_error', logPayload);
          }

          this.metrics.httpRequestDuration
            .labels(method, route, String(statusCode))
            .observe(ms);
        },
      }),
    );
  }
}
