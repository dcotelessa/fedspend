import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Agency } from '../src/agencies/agency.entity';
import { SpendingRecord } from '../src/spending/spending-record.entity';
import { GeoSpendingSnapshot } from '../src/geography/geo-spending-snapshot.entity';
import { DisasterFundingRecord } from '../src/disaster/disaster-funding-record.entity';
import { DisasterRecoveryRatio } from '../src/disaster/disaster-recovery-ratio.entity';
import { UsaSpendingService } from '../src/sync/usa-spending.service';
import { OpenFemaService } from '../src/sync/openfema.service';

describe('Sync E2E', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let mockUsaService: Partial<UsaSpendingService>;
  let mockFemaService: Partial<OpenFemaService>;

  const mockAgencies = [
    { id: 1, name: 'Test Agency 1', abbreviation: 'TA1', toptierCode: '001' },
    { id: 2, name: 'Test Agency 2', abbreviation: 'TA2', toptierCode: '002' },
  ];

  const mockSpendingRecords = [
    { 
      id: 1, 
      agencyId: 1, 
      fiscalYear: 2024, 
      quarter: 1, 
      awardTypeLabel: 'Grant', 
      awardTypeCodes: '', 
      obligatedAmount: 100000, 
      outlayAmount: 50000, 
      awardCount: 1 
    },
    { 
      id: 2, 
      agencyId: 2, 
      fiscalYear: 2024, 
      quarter: 1, 
      awardTypeLabel: 'Contract', 
      awardTypeCodes: '', 
      obligatedAmount: 200000, 
      outlayAmount: 100000, 
      awardCount: 1 
    },
  ];

  const mockGeoSnapshots = [
    { 
      id: 1, 
      stateCode: 'CA', 
      stateName: 'California', 
      fiscalYear: 2024, 
      agencyId: 1, 
      scope: 'recipient', 
      obligatedAmount: 150000, 
      awardCount: 2, 
      population: 1000000, 
      perCapita: 150 
    },
    { 
      id: 2, 
      stateCode: 'NY', 
      stateName: 'New York', 
      fiscalYear: 2024, 
      agencyId: 2, 
      scope: 'recipient', 
      obligatedAmount: 250000, 
      awardCount: 3, 
      population: 2000000, 
      perCapita: 125 
    },
  ];

  const mockDisasterRecords = [
    { 
      id: 1, 
      defGroup: 'JF-3038', 
      defCodes: 'JF-3038', 
      stateCode: 'CA', 
      stateName: 'California', 
      obligatedAmount: 300000, 
      awardCount: 5, 
      perCapita: 0, 
      population: 0 
    },
    { 
      id: 2, 
      defGroup: 'JF-3038', 
      defCodes: 'JF-3038', 
      stateCode: 'NY', 
      stateName: 'New York', 
      obligatedAmount: 400000, 
      awardCount: 6, 
      perCapita: 0, 
      population: 0 
    },
  ];

  const mockFemaDeclarations = [
    { 
      stateCode: 'CA', 
      stateName: 'California', 
      fiscalYear: 2024, 
      femaObligatedCents: 150000, 
      declarationCount: 2, 
      dominantIncidentType: 'Wildfire' 
    },
    { 
      stateCode: 'NY', 
      stateName: 'New York', 
      fiscalYear: 2024, 
      femaObligatedCents: 200000, 
      declarationCount: 3, 
      dominantIncidentType: 'Hurricane' 
    },
  ];

  beforeEach(async () => {
    mockUsaService = {
      fetchAgencies: jest.fn().mockResolvedValue({ status: 'success', agencies: mockAgencies }),
      fetchSpendingByAgency: jest.fn().mockResolvedValue({ status: 'success', rows: mockSpendingRecords, total: 2 }),
      fetchGeoSnapshots: jest.fn().mockResolvedValue({ status: 'success', rows: mockGeoSnapshots }),
      fetchDisasterSpending: jest.fn().mockResolvedValue({ status: 'success', rows: mockDisasterRecords }),
    };

    mockFemaService = {
      fetchDeclarationsByState: jest.fn().mockResolvedValue(mockFemaDeclarations),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule, TypeOrmModule.forFeature([
        Agency,
        SpendingRecord,
        GeoSpendingSnapshot,
        DisasterFundingRecord,
        DisasterRecoveryRatio,
      ])],
      providers: [
        { provide: UsaSpendingService, useValue: mockUsaService },
        { provide: OpenFemaService, useValue: mockFemaService },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    dataSource = moduleFixture.get<DataSource>(DataSource);
  });

  afterEach(async () => {
    await app.close();
  });

  it('should sync all data and populate all tables correctly', async () => {
    // Trigger the sync
    await request(app.getHttpServer())
      .post('/sync')
      .expect(200);

    // Verify agencies were saved
    const agencies = await dataSource.getRepository(Agency).find();
    expect(agencies).toHaveLength(2);
    expect(agencies[0].name).toBe('Test Agency 1');
    expect(agencies[1].name).toBe('Test Agency 2');

    // Verify spending records were saved
    const spendingRecords = await dataSource.getRepository(SpendingRecord).find();
    expect(spendingRecords).toHaveLength(2);
    expect(spendingRecords[0].obligatedAmount).toBe(100000);
    expect(spendingRecords[1].obligatedAmount).toBe(200000);

    // Verify geo snapshots were saved
    const geoSnapshots = await dataSource.getRepository(GeoSpendingSnapshot).find();
    expect(geoSnapshots).toHaveLength(2);
    expect(geoSnapshots[0].stateCode).toBe('CA');
    expect(geoSnapshots[1].stateCode).toBe('NY');

    // Verify disaster funding records were saved
    const disasterRecords = await dataSource.getRepository(DisasterFundingRecord).find();
    expect(disasterRecords).toHaveLength(2);
    expect(disasterRecords[0].obligatedAmount).toBe(300000);
    expect(disasterRecords[1].obligatedAmount).toBe(400000);

    // Verify disaster recovery ratios were saved
    const recoveryRatios = await dataSource.getRepository(DisasterRecoveryRatio).find();
    expect(recoveryRatios).toHaveLength(2);
    expect(recoveryRatios[0].stateCode).toBe('CA');
    expect(recoveryRatios[1].stateCode).toBe('NY');
    
    // Verify that the computed recovery ratio is correct
    // CA: fedSpending = 300000, femaObligated = 150000, ratio = 2.0
    expect(recoveryRatios[0].recoveryRatio).toBe(2.0);
    // NY: fedSpending = 400000, femaObligated = 200000, ratio = 2.0
    expect(recoveryRatios[1].recoveryRatio).toBe(2.0);

    // Verify that no real HTTP was issued by checking mocks were called
    expect(mockUsaService.fetchAgencies).toHaveBeenCalled();
    expect(mockUsaService.fetchSpendingByAgency).toHaveBeenCalled();
    expect(mockUsaService.fetchGeoSnapshots).toHaveBeenCalled();
    expect(mockUsaService.fetchDisasterSpending).toHaveBeenCalled();
    expect(mockFemaService.fetchDeclarationsByState).toHaveBeenCalled();
  });
});