import { Controller, Get, Param, Query } from '@nestjs/common';
import { DisasterService, QueryRatiosParams, QueryStatesParams } from './disaster.service';

@Controller('disaster')
export class DisasterController {
  constructor(private readonly service: DisasterService) {}

  @Get('overview')
  async getOverview() {
    return this.service.getOverview();
  }

  @Get('states')
  async queryStates(
    @Query('defGroup') defGroup?: string,
    @Query('fiscalYear') fiscalYear?: string,
  ) {
    const params: QueryStatesParams = {};
    if (defGroup) params.defGroup = defGroup;
    if (fiscalYear) params.fiscalYear = parseInt(fiscalYear, 10);
    return this.service.queryStates(params);
  }

  @Get('recovery-ratios')
  async queryRatios(
    @Query('fiscalYear') fiscalYear?: string,
  ) {
    const params: QueryRatiosParams = {};
    if (fiscalYear) params.fiscalYear = parseInt(fiscalYear, 10);
    return this.service.queryRatios(params);
  }

  @Get('state/:code')
  async getStateProfile(@Param('code') code: string) {
    return this.service.getStateProfile(code);
  }
}