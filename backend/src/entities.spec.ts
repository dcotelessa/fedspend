import { SpendingRecord } from './spending/spending-record.entity';
import { GeoSpendingSnapshot } from './geography/geo-spending-snapshot.entity';
import { DisasterFundingRecord } from './disaster/disaster-funding-record.entity';
import { DisasterRecoveryRatio } from './disaster/disaster-recovery-ratio.entity';
import { Agency } from './agencies/agency.entity';

describe('Entities Structure', () => {
  it('should have all 5 entity files', () => {
    // This test just validates that we can import all entities
    // The actual structure validation happens in the code review
    expect(SpendingRecord).toBeDefined();
    expect(GeoSpendingSnapshot).toBeDefined();
    expect(DisasterFundingRecord).toBeDefined();
    expect(DisasterRecoveryRatio).toBeDefined();
    expect(Agency).toBeDefined();
  });
});