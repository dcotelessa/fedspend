import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DisasterController } from './disaster.controller';
import { DisasterService } from './disaster.service';
import { DisasterFundingRecord } from './disaster-funding-record.entity';
import { DisasterRecoveryRatio } from './disaster-recovery-ratio.entity';

@Module({
  controllers: [DisasterController],
  providers: [DisasterService],
  imports: [TypeOrmModule.forFeature([DisasterFundingRecord, DisasterRecoveryRatio])]
})
export class DisasterModule {}