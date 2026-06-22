import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpendingController } from './spending.controller';
import { SpendingService } from './spending.service';
import { SpendingRecord } from './spending-record.entity';

@Module({
  controllers: [SpendingController],
  providers: [SpendingService],
  imports: [TypeOrmModule.forFeature([SpendingRecord])]
})
export class SpendingModule {}