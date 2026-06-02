import { Controller, Get, Res } from '@nestjs/common';
import * as express from 'express';
import { MetricsService } from './metrics.service';
import { Public } from '../../auth/public.decorator';

@Public()
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  async get(@Res() res: express.Response): Promise<void> {
    res.setHeader('Content-Type', this.metrics.getContentType());
    res.end(await this.metrics.getMetrics());
  }
}
