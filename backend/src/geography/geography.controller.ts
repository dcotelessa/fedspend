import { Controller, Get, Param, Query } from '@nestjs/common';
import { GeographyService } from './geography.service';

@Controller('geography')
export class GeographyController {
  constructor(private readonly geographyService: GeographyService) {}

  @Get('states')
  getStates(
    @Query('fiscalYear') fiscalYear?: number,
    @Query('agencyId') agencyId?: number,
    @Query('scope') scope?: string,
  ): Promise<any[]> {
    const params: Record<string, any> = {};
    if (fiscalYear !== undefined) params.fiscalYear = fiscalYear;
    if (agencyId !== undefined) params.agencyId = agencyId;
    if (scope !== undefined) params.scope = scope;
    return this.geographyService.queryStates(params);
  }

  @Get('state/:code')
  getStateDetail(@Param('code') code: string): Promise<any[]> {
    return this.geographyService.getStateDetail(code);
  }
}
