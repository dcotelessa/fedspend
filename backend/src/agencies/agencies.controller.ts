import { Controller, Get, Param, Query } from '@nestjs/common';
import { AgenciesService } from './agencies.service';
import { ApiResponse, AgencySummary } from '@shared/interfaces';
import { SpendingRecord } from '../spending/spending-record.entity';
import { AgencyListQueryDto } from './dto/agency-list-query.dto';

@Controller('agencies')
export class AgenciesController {
  constructor(private readonly agenciesService: AgenciesService) {}

  @Get()
  list(@Query() dto: AgencyListQueryDto): Promise<ApiResponse<{ id: number; name: string; totalCents: number }[]>> {
    return this.agenciesService.findAllWithTotals(dto.fiscalYear);
  }

  @Get(':id/summary')
  summary(@Param('id') id: string): Promise<AgencySummary | null> {
    return this.agenciesService.findSummary(Number(id));
  }

  @Get(':id/spotlight')
  spotlight(@Param('id') id: string): Promise<SpendingRecord[] | null> {
    return this.agenciesService.findSpotlight(Number(id));
  }
}
