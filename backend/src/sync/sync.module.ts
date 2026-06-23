import { Module } from '@nestjs/common';
import { SyncService } from './sync.service';
import { UsaSpendingService } from './usa-spending.service';
import { OpenFemaService } from './openfema.service';

@Module({
  providers: [SyncService, UsaSpendingService, OpenFemaService],
})
export class SyncModule {}