import { AgenciesModule } from './agencies/agencies.module';
import { GeographyModule } from './geography/geography.module';
import { DisasterModule } from './disaster/disaster.module';
import { SyncModule } from './sync/sync.module';
import { HealthModule } from './health/health.module';

describe('Modules', () => {
  it('should have all modules defined', () => {
    expect(AgenciesModule).toBeDefined();
    expect(GeographyModule).toBeDefined();
    expect(DisasterModule).toBeDefined();
    expect(SyncModule).toBeDefined();
    expect(HealthModule).toBeDefined();
  });
});
