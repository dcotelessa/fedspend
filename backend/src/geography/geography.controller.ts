import { Controller, Get, Param, Query } from '@nestjs/common';
import { GeographyService, QueryStatesInput } from './geography.service';
import { GeoSpendingSnapshot } from './geo-spending-snapshot.entity';

@Controller('geography')
export class GeographyController {
  constructor(private readonly geographyService: GeographyService) {}

  @Get('states')
  getStates(
    @Query('fiscalYear') fiscalYear?: number,
    @Query('agencyId') agencyId?: number,
    @Query('scope') scope?: string,
  ): Promise<GeoSpendingSnapshot[]> {
    return this.geographyService.queryStates({ fiscalYear, agencyId, scope });
  }

  @Get('state/:code')
  getStateDetail(@Param('code') code: string): Promise<GeoSpendingSnapshot[]> {
    return this.geographyService.getStateDetail(code);
  }
}
