import { DataSource, Repository } from 'typeorm';
import { Agency } from '../src/agencies/agency.entity';
import { SpendingRecord } from '../src/spending/spending-record.entity';
import { GeoSpendingSnapshot } from '../src/geography/geo-spending-snapshot.entity';
import { DisasterFundingRecord } from '../src/disaster/disaster-funding-record.entity';
import { DisasterRecoveryRatio } from '../src/disaster/disaster-recovery-ratio.entity';
import { TestingModule } from '@nestjs/testing';

export async function seedDatabase(module: TestingModule): Promise<void> {
  const dataSource = module.get<DataSource>(DataSource);
  
  const agencyRepo = dataSource.getRepository(Agency);
  const spendingRepo = dataSource.getRepository(SpendingRecord);
  const geoRepo = dataSource.getRepository(GeoSpendingSnapshot);
  const disasterFundingRepo = dataSource.getRepository(DisasterFundingRecord);
  const disasterRatioRepo = dataSource.getRepository(DisasterRecoveryRatio);

  await agencyRepo.clear();
  await spendingRepo.clear();
  await geoRepo.clear();
  await disasterFundingRepo.clear();
  await disasterRatioRepo.clear();

  const agencies = await agencyRepo.save([
    { name: 'Department of Defense', abbreviation: 'DOD', toptierCode: '097' },
    { name: 'Department of Health and Human Services', abbreviation: 'HHS', toptierCode: '075' },
    { name: 'Department of Education', abbreviation: 'ED', toptierCode: '091' },
    { name: 'Department of Transportation', abbreviation: 'DOT', toptierCode: '069' },
    { name: 'Department of Housing and Urban Development', abbreviation: 'HUD', toptierCode: '086' },
    { name: 'Department of Homeland Security', abbreviation: 'DHS', toptierCode: '070' },
  ]);

  await spendingRepo.save([
    {
      agencyId: agencies[0].id,
      fiscalYear: 2024,
      quarter: 1,
      awardTypeLabel: 'Contracts',
      awardTypeCodes: 'A,B,C',
      obligatedAmount: 1000000000,
      outlayAmount: 800000000,
      awardCount: 150,
    },
    {
      agencyId: agencies[0].id,
      fiscalYear: 2024,
      quarter: 2,
      awardTypeLabel: 'Grants',
      awardTypeCodes: 'D,E',
      obligatedAmount: 500000000,
      outlayAmount: 400000000,
      awardCount: 75,
    },
    {
      agencyId: agencies[1].id,
      fiscalYear: 2024,
      quarter: 1,
      awardTypeLabel: 'Grants',
      awardTypeCodes: 'D,E,F',
      obligatedAmount: 750000000,
      outlayAmount: 600000000,
      awardCount: 120,
    },
    {
      agencyId: agencies[1].id,
      fiscalYear: 2023,
      quarter: 4,
      awardTypeLabel: 'Contracts',
      awardTypeCodes: 'A',
      obligatedAmount: 300000000,
      outlayAmount: 250000000,
      awardCount: 45,
    },
    {
      agencyId: agencies[2].id,
      fiscalYear: 2024,
      quarter: 1,
      awardTypeLabel: 'Loans',
      awardTypeCodes: 'G',
      obligatedAmount: 200000000,
      outlayAmount: 100000000,
      awardCount: 30,
    },
  ]);

  await geoRepo.save([
    {
      stateCode: 'CA',
      stateName: 'California',
      fiscalYear: 2024,
      agencyId: agencies[0].id,
      scope: 'federal',
      obligatedAmount: 5000000000,
      awardCount: 2500,
      population: 39000000,
      perCapita: 128205,
    },
    {
      stateCode: 'NY',
      stateName: 'New York',
      fiscalYear: 2024,
      agencyId: agencies[1].id,
      scope: 'federal',
      obligatedAmount: 3500000000,
      awardCount: 1800,
      population: 19000000,
      perCapita: 184210,
    },
    {
      stateCode: 'TX',
      stateName: 'Texas',
      fiscalYear: 2024,
      agencyId: agencies[0].id,
      scope: 'federal',
      obligatedAmount: 4000000000,
      awardCount: 2000,
      population: 30000000,
      perCapita: 133333,
    },
    {
      stateCode: 'FL',
      stateName: 'Florida',
      fiscalYear: 2023,
      agencyId: agencies[3].id,
      scope: 'federal',
      obligatedAmount: 2500000000,
      awardCount: 1200,
      population: 22000000,
      perCapita: 113636,
    },
    {
      stateCode: 'CA',
      stateName: 'California',
      fiscalYear: 2023,
      agencyId: agencies[2].id,
      scope: 'federal',
      obligatedAmount: 3000000000,
      awardCount: 1500,
      population: 38000000,
      perCapita: 78947,
    },
  ]);

  await disasterFundingRepo.save([
    {
      defGroup: 'CA',
      defCodes: 'DR-1234,DR-1235',
      stateCode: 'CA',
      stateName: 'California',
      obligatedAmount: 5000000000,
      awardCount: 1250,
      perCapita: 128205,
      population: 39000000,
    },
    {
      defGroup: '01',
      defCodes: 'DR-5678',
      stateCode: 'NY',
      stateName: 'New York',
      obligatedAmount: 2000000000,
      awardCount: 500,
      perCapita: 105263,
      population: 19000000,
    },
    {
      defGroup: 'CA',
      defCodes: 'DR-9876',
      stateCode: 'TX',
      stateName: 'Texas',
      obligatedAmount: 3000000000,
      awardCount: 750,
      perCapita: 100000,
      population: 30000000,
    },
    {
      defGroup: '02',
      defCodes: 'DR-3456',
      stateCode: 'FL',
      stateName: 'Florida',
      obligatedAmount: 1500000000,
      awardCount: 375,
      perCapita: 68181,
      population: 22000000,
    },
    {
      defGroup: '01',
      defCodes: 'DR-7890',
      stateCode: 'TX',
      stateName: 'Texas',
      obligatedAmount: 1000000000,
      awardCount: 250,
      perCapita: 33333,
      population: 30000000,
    },
  ]);

  await disasterRatioRepo.save([
    {
      stateCode: 'CA',
      stateName: 'California',
      fiscalYear: 2024,
      femaObligated: 1000000000,
      fedSpendingObligated: 2000000000,
      declarationCount: 8,
      recoveryRatio: 2.0,
      dominantIncidentType: 'Wildfire',
    },
    {
      stateCode: 'NY',
      stateName: 'New York',
      fiscalYear: 2024,
      femaObligated: 500000000,
      fedSpendingObligated: 150000000,
      declarationCount: 3,
      recoveryRatio: 0.3,
      dominantIncidentType: 'Hurricane',
    },
    {
      stateCode: 'TX',
      stateName: 'Texas',
      fiscalYear: 2024,
      femaObligated: 800000000,
      fedSpendingObligated: 1200000000,
      declarationCount: 5,
      recoveryRatio: 1.5,
      dominantIncidentType: 'Hurricane',
    },
    {
      stateCode: 'FL',
      stateName: 'Florida',
      fiscalYear: 2023,
      femaObligated: 600000000,
      fedSpendingObligated: 600000000,
      declarationCount: 4,
      recoveryRatio: 1.0,
      dominantIncidentType: 'Hurricane',
    },
    {
      stateCode: 'CA',
      stateName: 'California',
      fiscalYear: 2023,
      femaObligated: 400000000,
      fedSpendingObligated: 120000000,
      declarationCount: 6,
      recoveryRatio: 0.3,
      dominantIncidentType: 'Earthquake',
    },
  ]);
}