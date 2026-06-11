import { Controller, Get } from '@nestjs/common';
import { MetroIncidentsService } from './metro-incidents.service';

@Controller('metro/incidents')
export class MetroIncidentsController {
  constructor(private readonly metroIncidentsService: MetroIncidentsService) {}

  @Get()
  async getIncidents() {
    return this.metroIncidentsService.getIncidents();
  }
}
