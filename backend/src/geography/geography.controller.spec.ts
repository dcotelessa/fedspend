import { GeographyController } from './geography.controller';
import { GeographyService } from './geography.service';
import { GeoSpendingSnapshot } from './geo-spending-snapshot.entity';
import { GeographyQueryDto } from './dto/geography-query.dto';

describe('GeographyController', () => {
  interface TestCase {
    name: string;
    input: Partial<GeographyQueryDto>;
    serviceReturn: GeoSpendingSnapshot[];
    expected: GeoSpendingSnapshot[];
  }

  let controller: GeographyController;

  beforeEach(() => {
    const mockService = {
      queryStates: jest.fn(),
      getStateDetail: jest.fn(),
    };
    controller = new GeographyController(mockService as any);
  });

  it.each([
    {
      name: 'forwards valid query dto to service queryStates',
      input: { fiscalYear: 2024, scope: 'state' },
      serviceReturn: [{ id: 1, stateCode: 'AL' }],
      expected: [{ id: 1, stateCode: 'AL' }],
    },
    {
      name: 'forwards fiscalYear with agencyId and scope',
      input: { fiscalYear: 2023, agencyId: 2, scope: 'county' },
      serviceReturn: [],
      expected: [],
    },
    {
      name: 'forwards fiscalYear with only scope',
      input: { fiscalYear: 2024, scope: 'county' },
      serviceReturn: [],
      expected: [],
    },
    {
      name: 'forwards fiscalYear without agencyId for combined-agency data',
      input: { fiscalYear: 2024 },
      serviceReturn: [],
      expected: [],
    },
    {
      name: 'forwards fiscalYear with agencyId but no scope',
      input: { fiscalYear: 2024, agencyId: 1 },
      serviceReturn: [],
      expected: [],
    },
  ])('$name', async ({ input, serviceReturn, expected }) => {
    controller['geographyService'].queryStates.mockResolvedValue(serviceReturn);
    const result = await controller.getStates(input);
    expect(result).toEqual(expected);
    expect(controller['geographyService'].queryStates).toHaveBeenCalledWith({
      fiscalYear: input.fiscalYear,
      agencyId: input.agencyId,
      scope: input.scope,
    });
  });

  it('should return state detail for a given state code', async () => {
    const mockResult: GeoSpendingSnapshot[] = [
      {
        id: 1,
        stateCode: 'CA',
        stateName: 'California',
        fiscalYear: 2024,
        agencyId: 1,
        scope: 'state',
        obligatedAmount: 1500000,
        awardCount: 30,
        population: 40000000,
        perCapita: 3750,
      } as GeoSpendingSnapshot,
    ];
    controller['geographyService'].getStateDetail.mockResolvedValue(mockResult);

    const result = await controller.getStateDetail('CA');

    expect(result).toEqual(mockResult);
    expect(controller['geographyService'].getStateDetail).toHaveBeenCalledWith('CA');
  });
});
