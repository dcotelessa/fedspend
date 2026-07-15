import { Controller, Get, Param, Query } from '@nestjs/common';
import { GeographyService } from './geography.service';
import { GeoSpendingSnapshot } from './geo-spending-snapshot.entity';
import { GeographyQueryDto } from './dto/geography-query.dto';

@Controller('geography')
export class GeographyController {
  constructor(private readonly geographyService: GeographyService) {}

  @Get('states')
  getStates(@Query() dto: GeographyQueryDto): Promise<GeoSpendingSnapshot[]> {
    return this.geographyService.queryStates({
      fiscalYear: dto.fiscalYear,
      agencyId: dto.agencyId,
      scope: dto.scope,
    });
  }

  @Get('state/:code')
  getStateDetail(@Param('code') code: string): Promise<GeoSpendingSnapshot[]> {
    return this.geographyService.getStateDetail(code);
  }
}
