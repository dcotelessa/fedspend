import { validate } from 'class-validator';
import { PaginationDto, ScopeEnum } from '../common/pagination.dto';
import { GeographyQueryDto } from '../geography/dto/geography-query.dto';
import { AgencySpotlightQueryDto } from '../agencies/dto/agency-spotlight-query.dto';
import { DisasterStatesQueryDto, DefGroupEnum } from '../disaster/dto/disaster-states-query.dto';
import { DisasterRatiosQueryDto } from '../disaster/dto/disaster-ratios-query.dto';

describe('DTOs Validation', () => {
  interface TestCase {
    name: string;
    input: any;
    expectedValid: boolean;
  }

  const run = async (Dto: any, table: TestCase[]) => {
    for (const { name, input, expectedValid } of table) {
      it(name, async () => {
        const dto = new Dto();
        Object.assign(dto, input);
        const errors = await validate(dto);
        expect(errors.length > 0).toBe(!expectedValid);
      });
    }
  };

  describe('PaginationDto', () => {
    const testTable: TestCase[] = [
      {
        name: 'accepts valid page and pageSize',
        input: { page: 2, pageSize: 20 },
        expectedValid: true,
      },
      {
        name: 'accepts default values',
        input: {},
        expectedValid: true,
      },
      {
        name: 'accepts page=1 minimum',
        input: { page: 1 },
        expectedValid: true,
      },
      {
        name: 'accepts pageSize=1 minimum',
        input: { pageSize: 1 },
        expectedValid: true,
      },
      {
        name: 'accepts pageSize=100 maximum',
        input: { pageSize: 100 },
        expectedValid: true,
      },
      {
        name: 'rejects page below 1',
        input: { page: 0 },
        expectedValid: false,
      },
      {
        name: 'rejects pageSize above 100',
        input: { pageSize: 101 },
        expectedValid: false,
      },
      {
        name: 'rejects pageSize of 0',
        input: { pageSize: 0 },
        expectedValid: false,
      },
    ];

    run(PaginationDto, testTable);
  });

  describe('GeographyQueryDto + AgencySpotlightQueryDto', () => {
    const testTable: TestCase[] = [
      {
        name: 'accepts valid fiscalYear and scope',
        input: { fiscalYear: 2024, scope: ScopeEnum.state },
        expectedValid: true,
      },
      {
        name: 'accepts scope=county',
        input: { fiscalYear: 2024, scope: ScopeEnum.county },
        expectedValid: true,
      },
      {
        name: 'accepts scope=congressional',
        input: { fiscalYear: 2024, scope: ScopeEnum.congressional },
        expectedValid: true,
      },
      {
        name: 'rejects fiscalYear below 2020',
        input: { fiscalYear: 2019, scope: ScopeEnum.state },
        expectedValid: false,
      },
      {
        name: 'rejects fiscalYear above 2024',
        input: { fiscalYear: 2025, scope: ScopeEnum.state },
        expectedValid: false,
      },
      {
        name: 'rejects fiscalYear as string',
        input: { fiscalYear: '2024', scope: ScopeEnum.state },
        expectedValid: false,
      },
      {
        name: 'rejects empty object (scope required)',
        input: {},
        expectedValid: false,
      },
      {
        name: 'rejects missing scope (required)',
        input: { fiscalYear: 2024 },
        expectedValid: false,
      },
      {
        name: 'rejects invalid scope value',
        input: { fiscalYear: 2024, scope: 'invalid' },
        expectedValid: false,
      },
    ];

    const runFor = async (Dto: any, dtoName: string) => {
      for (const { name, input, expectedValid } of testTable) {
        it(`${dtoName} - ${name}`, async () => {
          const dto = new Dto();
          Object.assign(dto, input);
          const errors = await validate(dto);
          expect(errors.length > 0).toBe(!expectedValid);
        });
      }
    };

    runFor(GeographyQueryDto, 'GeographyQueryDto');
    runFor(AgencySpotlightQueryDto, 'AgencySpotlightQueryDto');
  });

  describe('DisasterStatesQueryDto', () => {
    const testTable: TestCase[] = [
      {
        name: 'accepts valid fiscalYear and defGroup',
        input: { fiscalYear: 2024, defGroup: DefGroupEnum.wildfire },
        expectedValid: true,
      },
      {
        name: 'accepts defGroup=flood',
        input: { fiscalYear: 2024, defGroup: DefGroupEnum.flood },
        expectedValid: true,
      },
      {
        name: 'rejects fiscalYear below 2020',
        input: { fiscalYear: 2019, defGroup: DefGroupEnum.wildfire },
        expectedValid: false,
      },
      {
        name: 'rejects fiscalYear above 2024',
        input: { fiscalYear: 2025, defGroup: DefGroupEnum.wildfire },
        expectedValid: false,
      },
      {
        name: 'rejects fiscalYear as string',
        input: { fiscalYear: '2024', defGroup: DefGroupEnum.wildfire },
        expectedValid: false,
      },
      {
        name: 'rejects empty object (defGroup required)',
        input: {},
        expectedValid: false,
      },
      {
        name: 'rejects missing defGroup (required)',
        input: { fiscalYear: 2024 },
        expectedValid: false,
      },
      {
        name: 'rejects invalid defGroup value',
        input: { fiscalYear: 2024, defGroup: 'invalid' },
        expectedValid: false,
      },
    ];

    run(DisasterStatesQueryDto, testTable);
  });

  describe('DisasterRatiosQueryDto', () => {
    const testTable: TestCase[] = [
      {
        name: 'accepts valid fiscalYear',
        input: { fiscalYear: 2024 },
        expectedValid: true,
      },
      {
        name: 'rejects fiscalYear below 2020',
        input: { fiscalYear: 2019 },
        expectedValid: false,
      },
      {
        name: 'rejects fiscalYear above 2024',
        input: { fiscalYear: 2025 },
        expectedValid: false,
      },
      {
        name: 'accepts default values',
        input: {},
        expectedValid: true,
      },
      {
        name: 'rejects fiscalYear as string',
        input: { fiscalYear: '2024' },
        expectedValid: false,
      },
    ];

    run(DisasterRatiosQueryDto, testTable);
  });
});
