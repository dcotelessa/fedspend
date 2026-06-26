import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AgenciesModule } from '../src/agencies/agencies.module';
import { GeographyModule } from '../src/geography/geography.module';
import { DisasterModule } from '../src/disaster/disaster.module';
import { Agency } from '../src/agencies/agency.entity';
import { SpendingRecord } from '../src/spending/spending-record.entity';
import { GeoSpendingSnapshot } from '../src/geography/geo-spending-snapshot.entity';
import { DisasterFundingRecord } from '../src/disaster/disaster-funding-record.entity';
import { DisasterRecoveryRatio } from '../src/disaster/disaster-recovery-ratio.entity';
import { seedDatabase } from './seed';

interface TestCase {
  name: string;
  method: 'get' | 'post';
  path: string;
  expectedStatus: number;
  expectedBody: any;
  query?: Record<string, string>;
}

describe('Query API Endpoints (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          entities: [Agency, SpendingRecord, GeoSpendingSnapshot, DisasterFundingRecord, DisasterRecoveryRatio],
          synchronize: true,
          dropSchema: true,
        }),
        AgenciesModule,
        GeographyModule,
        DisasterModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    await seedDatabase(moduleFixture);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  async function assertEndpointResponse(testCase: TestCase): Promise<void> {
    const response = await request(app.getHttpServer())[testCase.method](testCase.path).query(testCase.query || {});
    expect(response.status).toBe(testCase.expectedStatus);
    expect(response.body).toEqual(testCase.expectedBody);
  }

  describe('Agencies endpoints', () => {
    const testCases: TestCase[] = [
      {
        name: 'GET /agencies returns all agencies with totalCents',
        method: 'get',
        path: '/agencies',
        expectedStatus: 200,
        expectedBody: {
          data: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(Number),
              name: expect.any(String),
              totalCents: expect.any(Number),
            }),
          ]),
          meta: expect.objectContaining({
            page: expect.any(Number),
            pageSize: expect.any(Number),
            total: expect.any(Number),
          }),
        },
      },
      {
        name: 'GET /agencies/:id/summary returns agency summary for valid id',
        method: 'get',
        path: '/agencies/1/summary',
        expectedStatus: 200,
        expectedBody: expect.objectContaining({
          agency: expect.objectContaining({
            id: expect.any(Number),
            name: expect.any(String),
            abbreviation: expect.any(String),
            toptierCode: expect.any(String),
          }),
          currentFyTotal: expect.any(Number),
          priorFyTotal: expect.any(Number),
          yoyChange: expect.any(Number),
        }),
      },
      {
        name: 'GET /agencies/:id/summary returns empty object for invalid id',
        method: 'get',
        path: '/agencies/999/summary',
        expectedStatus: 200,
        expectedBody: {},
      },
      {
        name: 'GET /agencies/:id/spotlight returns spotlight records for valid id',
        method: 'get',
        path: '/agencies/1/spotlight',
        expectedStatus: 200,
        expectedBody: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(Number),
            agencyId: 1,
            fiscalYear: expect.any(Number),
            quarter: expect.any(Number),
            obligatedAmount: expect.any(Number),
          }),
        ]),
      },
      {
        name: 'GET /agencies/:id/spotlight returns empty object for invalid id',
        method: 'get',
        path: '/agencies/999/spotlight',
        expectedStatus: 200,
        expectedBody: {},
      },
    ];

    it.each(testCases)('$name', assertEndpointResponse);
  });

  describe('Geography endpoints', () => {
    const testCases: TestCase[] = [
      {
        name: 'GET /geography/states returns empty array without agencyId filter',
        method: 'get',
        path: '/geography/states',
        expectedStatus: 200,
        expectedBody: [],
      },
      {
        name: 'GET /geography/states with fiscalYear but no agencyId returns empty',
        method: 'get',
        path: '/geography/states',
        expectedStatus: 200,
        expectedBody: [],
        query: { fiscalYear: '2024' },
      },
      {
        name: 'GET /geography/states filters by fiscalYear and agencyId',
        method: 'get',
        path: '/geography/states',
        expectedStatus: 200,
        expectedBody: expect.arrayContaining([
          expect.objectContaining({
            fiscalYear: 2024,
            agencyId: 1,
          }),
        ]),
        query: { fiscalYear: '2024', agencyId: '1' },
      },
      {
        name: 'GET /geography/states filters by agencyId',
        method: 'get',
        path: '/geography/states',
        expectedStatus: 200,
        expectedBody: expect.arrayContaining([
          expect.objectContaining({
            agencyId: 1,
          }),
        ]),
        query: { agencyId: '1' },
      },
      {
        name: 'GET /geography/states filters by scope and agencyId',
        method: 'get',
        path: '/geography/states',
        expectedStatus: 200,
        expectedBody: expect.arrayContaining([
          expect.objectContaining({
            scope: 'federal',
            agencyId: 1,
          }),
        ]),
        query: { scope: 'federal', agencyId: '1' },
      },
      {
        name: 'GET /geography/state/:code returns detail for valid state',
        method: 'get',
        path: '/geography/state/CA',
        expectedStatus: 200,
        expectedBody: expect.arrayContaining([
          expect.objectContaining({
            stateCode: 'CA',
            stateName: 'California',
            obligatedAmount: expect.any(Number),
            perCapita: expect.any(Number),
          }),
        ]),
      },
      {
        name: 'GET /geography/state/:code returns empty array for invalid state',
        method: 'get',
        path: '/geography/state/ZZ',
        expectedStatus: 200,
        expectedBody: [],
      },
    ];

    it.each(testCases)('$name', assertEndpointResponse);
  });

  describe('Disaster endpoints', () => {
    const testCases: TestCase[] = [
      {
        name: 'GET /disaster/overview returns overview by DEF group',
        method: 'get',
        path: '/disaster/overview',
        expectedStatus: 200,
        expectedBody: expect.arrayContaining([
          expect.objectContaining({
            defGroup: expect.any(String),
            totalObligated: expect.any(Number),
            totalAwardCount: expect.any(Number),
            stateCount: expect.any(Number),
            highestPerCapitaState: expect.any(String),
            highestPerCapita: expect.any(Number),
            coverageGapCount: expect.any(Number),
          }),
        ]),
      },
      {
        name: 'GET /disaster/states filters by defGroup and sorts by obligatedAmount desc',
        method: 'get',
        path: '/disaster/states',
        expectedStatus: 200,
        expectedBody: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(Number),
            defGroup: 'CA',
            stateCode: expect.any(String),
            obligatedAmount: expect.any(Number),
            perCapita: expect.any(Number),
          }),
        ]),
        query: { defGroup: 'CA' },
      },
      {
        name: 'GET /disaster/states orders matching rows by obligatedAmount desc',
        method: 'get',
        path: '/disaster/states',
        expectedStatus: 200,
        expectedBody: [
          expect.objectContaining({ defGroup: 'CA', stateCode: 'CA', obligatedAmount: 5000000000 }),
          expect.objectContaining({ defGroup: 'CA', stateCode: 'TX', obligatedAmount: 3000000000 }),
        ],
        query: { defGroup: 'CA' },
      },
      {
        name: 'GET /disaster/recovery-ratios returns ratios sorted ascending by recoveryRatio',
        method: 'get',
        path: '/disaster/recovery-ratios',
        expectedStatus: 200,
        expectedBody: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(Number),
            stateCode: expect.any(String),
            fiscalYear: expect.any(Number),
            femaObligated: expect.any(Number),
            fedSpendingObligated: expect.any(Number),
            recoveryRatio: expect.any(Number),
            declarationCount: expect.any(Number),
          }),
        ]),
      },
      {
        name: 'GET /disaster/recovery-ratios orders all rows ascending by recoveryRatio',
        method: 'get',
        path: '/disaster/recovery-ratios',
        expectedStatus: 200,
        expectedBody: [
          expect.objectContaining({ recoveryRatio: 0.3 }),
          expect.objectContaining({ recoveryRatio: 0.3 }),
          expect.objectContaining({ recoveryRatio: 1.0 }),
          expect.objectContaining({ recoveryRatio: 1.5 }),
          expect.objectContaining({ recoveryRatio: 2.0 }),
        ],
      },
      {
        name: 'GET /disaster/recovery-ratios filters by fiscalYear',
        method: 'get',
        path: '/disaster/recovery-ratios',
        expectedStatus: 200,
        expectedBody: expect.arrayContaining([
          expect.objectContaining({
            fiscalYear: 2024,
          }),
        ]),
        query: { fiscalYear: '2024' },
      },
      {
        name: 'GET /disaster/state/:code returns full profile for valid state',
        method: 'get',
        path: '/disaster/state/CA',
        expectedStatus: 200,
        expectedBody: expect.objectContaining({
          stateCode: 'CA',
          stateName: 'California',
          totalObligated: expect.any(Number),
          totalAwardCount: expect.any(Number),
          ratios: expect.any(Array),
          declarationCount: expect.any(Number),
        }),
      },
      {
        name: 'GET /disaster/state/:code returns empty object for invalid state',
        method: 'get',
        path: '/disaster/state/ZZ',
        expectedStatus: 200,
        expectedBody: {},
      },
    ];

    it.each(testCases)('$name', assertEndpointResponse);
  });
});