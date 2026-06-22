import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GeographyController } from './geography.controller';
import { GeographyService } from './geography.service';
import { GeoSpendingSnapshot } from './geo-spending-snapshot.entity';

@Module({
  controllers: [GeographyController],
  providers: [GeographyService],
  imports: [TypeOrmModule.forFeature([GeoSpendingSnapshot])]
})
export class GeographyModule {}