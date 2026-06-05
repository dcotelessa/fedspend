import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { mkdirSync } from 'fs';

export function getTypeOrmConfig(configService: ConfigService): TypeOrmModuleOptions {
  const databaseUrl = configService.get<string>('DATABASE_URL');
  if (databaseUrl) {
    return {
      type: 'postgres',
      url: databaseUrl,
      synchronize: false,
      migrationsRun: true,
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    } as TypeOrmModuleOptions;
  }
  mkdirSync('data', { recursive: true });
  return {
    type: 'better-sqlite3',
    database: 'data/fedspend.sqlite',
    synchronize: true,
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  } as TypeOrmModuleOptions;
}
