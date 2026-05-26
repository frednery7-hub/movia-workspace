import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';
import * as crypto from 'crypto';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const correlationId = crypto.randomBytes(8).toString('hex');
    const startMs = Date.now();

    const method = req.method;
    const url = req.url;

    req.headers['x-correlation-id'] = correlationId;

    return next.handle().pipe(
      tap({
        next: () => {
          const ms = Date.now() - startMs;
          const res = context.switchToHttp().getResponse();
          this.logger.log(
            `${method} ${url} ${res.statusCode} — ${ms}ms [${correlationId}]`,
          );
        },
        error: (err) => {
          const ms = Date.now() - startMs;
          this.logger.error(
            `${method} ${url} ERROR — ${ms}ms [${correlationId}]: ${err.message}`,
          );
        },
      }),
    );
  }
}
