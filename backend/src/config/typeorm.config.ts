import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { mkdirSync } from 'fs';

export function getTypeOrmConfig(configService: ConfigService): TypeOrmModuleOptions {
  const databaseUrl = configService.get('DATABASE_URL');

  if (databaseUrl) {
    return {
      type: 'postgres',
      url: databaseUrl,
      autoLoadEntities: true,
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      migrationsRun: false,
      synchronize: false,
    };
  }

  mkdirSync('data', { recursive: true });

  return {
    type: 'better-sqlite3',
    database: './data/dev.db',
    autoLoadEntities: true,
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: true,
  };
}
