import { Controller, Get } from '@nestjs/common';
import { LinesService } from './lines.service';
import { Public } from '../auth/public.decorator';

@Controller('lines')
export class LinesController {
  constructor(private readonly linesService: LinesService) {}

  @Public()
  @Get()
  findAll() {
    return this.linesService.findAll();
  }
}
