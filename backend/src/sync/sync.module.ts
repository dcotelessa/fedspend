import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SyncService } from './sync.service';
import { SyncController } from './sync.controller';
import { UsaSpendingService } from './usa-spending.service';
import { OpenFemaService } from './openfema.service';
import { Agency } from '../agencies/agency.entity';
import { SpendingRecord } from '../spending/spending-record.entity';
import { GeoSpendingSnapshot } from '../geography/geo-spending-snapshot.entity';
import { DisasterFundingRecord } from '../disaster/disaster-funding-record.entity';
import { DisasterRecoveryRatio } from '../disaster/disaster-recovery-ratio.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Agency,
      SpendingRecord,
      GeoSpendingSnapshot,
      DisasterFundingRecord,
      DisasterRecoveryRatio,
    ]),
  ],
  providers: [SyncService, UsaSpendingService, OpenFemaService],
  controllers: [SyncController],
})
export class SyncModule {}
