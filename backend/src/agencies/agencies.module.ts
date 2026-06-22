import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgenciesController } from './agencies.controller';
import { AgenciesService } from './agencies.service';
import { Agency } from './agency.entity';

@Module({
  controllers: [AgenciesController],
  providers: [AgenciesService],
  imports: [TypeOrmModule.forFeature([Agency])]
})
export class AgenciesModule {}