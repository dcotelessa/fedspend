import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgenciesController } from './agencies.controller';
import { AgenciesService } from './agencies.service';
import { Agency } from './agency.entity';
import { SpendingRecord } from '../spending/spending-record.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  controllers: [AgenciesController],
  providers: [AgenciesService, ConfigService],
  imports: [TypeOrmModule.forFeature([Agency, SpendingRecord]), ConfigModule],
})
export class AgenciesModule {}