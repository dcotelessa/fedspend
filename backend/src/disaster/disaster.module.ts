import { Module } from '@nestjs/common';
import { DisasterController } from './disaster.controller';
import { DisasterService } from './disaster.service';

@Module({
  controllers: [DisasterController],
  providers: [DisasterService],
})
export class DisasterModule {}