import { Controller, Get, Res, Headers } from '@nestjs/common';
import * as express from 'express';
import { MetricsService } from './metrics.service';
import { Public } from '../../auth/public.decorator';

@Public()
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  async get(
    @Res() res: express.Response,
    @Headers('authorization') auth?: string,
  ): Promise<void> {
    const token = process.env.METRICS_TOKEN;
    if (token) {
      if (auth !== `Bearer ${token}`) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }
    }
    res.setHeader('Content-Type', this.metrics.getContentType());
    res.end(await this.metrics.getMetrics());
  }
}
