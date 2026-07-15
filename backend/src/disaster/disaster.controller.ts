import { Controller, Get, Param, Query } from '@nestjs/common';
import { DisasterService } from './disaster.service';
import { DisasterQueryDto } from './dto/disaster-query.dto';

@Controller('disaster')
export class DisasterController {
  constructor(private readonly service: DisasterService) {}

  @Get('overview')
  async getOverview(@Query() dto?: DisasterQueryDto) {
    return this.service.getOverview(dto ?? {});
  }

  @Get('states')
  async queryStates(@Query() dto?: DisasterQueryDto) {
    return this.service.queryStates(dto ?? {});
  }

  @Get('recovery-ratios')
  async queryRatios(@Query() dto?: DisasterQueryDto) {
    return this.service.queryRatios(dto ?? {});
  }

  @Get('state/:code')
  async getStateProfile(@Param('code') code: string) {
    return this.service.getStateProfile(code);
  }
}
