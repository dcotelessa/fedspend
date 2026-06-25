import { validate } from 'class-validator';
import { 
  PaginationDto 
} from '../common/pagination.dto';
import { 
  GeographyQueryDto, 
  ScopeEnum as GeographyScopeEnum 
} from '../geography/dto/geography-query.dto';
import { 
  AgencySpotlightQueryDto, 
  ScopeEnum as AgencyScopeEnum 
} from '../agencies/dto/agency-spotlight-query.dto';
import { 
  DisasterStatesQueryDto, 
  DefGroupEnum 
} from '../disaster/dto/disaster-states-query.dto';
import { 
  DisasterRatiosQueryDto 
} from '../disaster/dto/disaster-ratios-query.dto';

describe('DTOs Validation', () => {
  interface TestCase {
    name: string;
    input: any;
    expectedValid: boolean;
  }

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
        name: 'rejects page below 1',
        input: { page: 0 },
        expectedValid: false,
      },
      {
        name: 'rejects pageSize above 100',
        input: { pageSize: 101 },
        expectedValid: false,
      },
    ];

    testTable.forEach(({ name, input, expectedValid }) => {
      it(name, async () => {
        const dto = new PaginationDto();
        Object.assign(dto, input);
        const errors = await validate(dto);
        expect(errors.length > 0).toBe(!expectedValid);
      });
    });
  });

  describe('GeographyQueryDto', () => {
    const testTable: TestCase[] = [
      {
        name: 'accepts valid fiscalYear and scope',
        input: { fiscalYear: 2024, scope: GeographyScopeEnum.state },
        expectedValid: true,
      },
      {
        name: 'rejects fiscalYear below 2020',
        input: { fiscalYear: 2019, scope: GeographyScopeEnum.state },
        expectedValid: false,
      },
      {
        name: 'rejects fiscalYear above 2024',
        input: { fiscalYear: 2025, scope: GeographyScopeEnum.state },
        expectedValid: false,
      },
      {
        name: 'accepts default values',
        input: {},
        expectedValid: true,
      },
    ];

    testTable.forEach(({ name, input, expectedValid }) => {
      it(name, async () => {
        const dto = new GeographyQueryDto();
        Object.assign(dto, input);
        const errors = await validate(dto);
        expect(errors.length > 0).toBe(!expectedValid);
      });
    });
  });

  describe('AgencySpotlightQueryDto', () => {
    const testTable: TestCase[] = [
      {
        name: 'accepts valid fiscalYear and scope',
        input: { fiscalYear: 2024, scope: AgencyScopeEnum.state },
        expectedValid: true,
      },
      {
        name: 'rejects fiscalYear below 2020',
        input: { fiscalYear: 2019, scope: AgencyScopeEnum.state },
        expectedValid: false,
      },
      {
        name: 'rejects fiscalYear above 2024',
        input: { fiscalYear: 2025, scope: AgencyScopeEnum.state },
        expectedValid: false,
      },
      {
        name: 'accepts default values',
        input: {},
        expectedValid: true,
      },
    ];

    testTable.forEach(({ name, input, expectedValid }) => {
      it(name, async () => {
        const dto = new AgencySpotlightQueryDto();
        Object.assign(dto, input);
        const errors = await validate(dto);
        expect(errors.length > 0).toBe(!expectedValid);
      });
    });
  });

  describe('DisasterStatesQueryDto', () => {
    const testTable: TestCase[] = [
      {
        name: 'accepts valid fiscalYear and defGroup',
        input: { fiscalYear: 2024, defGroup: DefGroupEnum.wildfire },
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
        name: 'accepts default values',
        input: {},
        expectedValid: true,
      },
    ];

    testTable.forEach(({ name, input, expectedValid }) => {
      it(name, async () => {
        const dto = new DisasterStatesQueryDto();
        Object.assign(dto, input);
        const errors = await validate(dto);
        expect(errors.length > 0).toBe(!expectedValid);
      });
    });
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
    ];

    testTable.forEach(({ name, input, expectedValid }) => {
      it(name, async () => {
        const dto = new DisasterRatiosQueryDto();
        Object.assign(dto, input);
        const errors = await validate(dto);
        expect(errors.length > 0).toBe(!expectedValid);
      });
    });
  });
});