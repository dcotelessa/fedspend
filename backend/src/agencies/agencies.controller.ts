import { Controller, Get, Param } from '@nestjs/common';
import { AgenciesService } from './agencies.service';
import { ApiResponse } from '@shared/interfaces';

@Controller('agencies')
export class AgenciesController {
  constructor(private readonly agenciesService: AgenciesService) {}

  @Get()
  list(): Promise<ApiResponse<{ id: number; name: string; totalCents: number }[]>> {
    return this.agenciesService.findAllWithTotals();
  }

  @Get(':id/summary')
  summary(@Param('id') id: string): Promise<any> {
    return this.agenciesService.findSummary(Number(id));
  }

  @Get(':id/spotlight')
  spotlight(@Param('id') id: string): Promise<any> {
    return this.agenciesService.findSpotlight(Number(id));
  }
}