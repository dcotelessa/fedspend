import { ScheduleModule } from '@nestjs/schedule';
import 'reflect-metadata';
import { AppModule } from '../app.module';
import { SyncService } from './sync.service';

describe('SyncService schedule', () => {
  interface TestCase {
    name: string;
    check: () => boolean;
  }

  const testTable: TestCase[] = [
    {
      name: 'ScheduleModule.forRoot() is in AppModule imports',
      check: () => {
        const imports = Reflect.getMetadata('imports', AppModule) as any[];
        return (
          Array.isArray(imports) &&
          imports.some(
            (m: any) =>
              m && m.module === ScheduleModule && m.global === true,
          )
        );
      },
    },
    {
      name: 'syncAll method has @Cron decorator with expression 0 2 * * *',
      check: () => {
        const meta = Reflect.getMetadata(
          'SCHEDULE_CRON_OPTIONS',
          SyncService.prototype.syncAll,
        );
        return meta && meta.cronTime === '0 2 * * *';
      },
    },
    {
      name: 'SyncService.syncAll is a function',
      check: () => typeof SyncService.prototype.syncAll === 'function',
    },
  ];

  testTable.forEach(({ name, check }) => {
    it(name, () => {
      expect(check()).toBe(true);
    });
  });
});
