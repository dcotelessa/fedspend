import { Module } from '@nestjs/common';
import { SyncService } from './sync.service';
import { UsaSpendingService } from './usa-spending.service';

@Module({
  providers: [SyncService, UsaSpendingService],
})
export class SyncModule {}