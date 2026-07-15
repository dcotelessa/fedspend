import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { getTypeOrmConfig } from './config/typeorm.config';
import { AgenciesModule } from './agencies/agencies.module';
import { GeographyModule } from './geography/geography.module';
import { DisasterModule } from './disaster/disaster.module';
import { SyncModule } from './sync/sync.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: getTypeOrmConfig,
    }),
    ScheduleModule.forRoot(),
    AgenciesModule,
    GeographyModule,
    DisasterModule,
    SyncModule,
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
