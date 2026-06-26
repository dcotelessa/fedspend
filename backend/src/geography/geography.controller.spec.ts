import { Test, TestingModule } from '@nestjs/testing';
import { GeographyController } from './geography.controller';
import { GeographyService } from './geography.service';
import { GeoSpendingSnapshot } from './geo-spending-snapshot.entity';

describe('GeographyController', () => {
  let controller: GeographyController;
  let service: GeographyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GeographyController],
      providers: [
        {
          provide: GeographyService,
          useValue: {
            queryStates: jest.fn(),
            getStateDetail: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<GeographyController>(GeographyController);
    service = module.get<GeographyService>(GeographyService);
  });

  it('should query states with fiscalYear', async () => {
    const mockResult: GeoSpendingSnapshot[] = [
      {
        id: 1,
        stateCode: 'AL',
        stateName: 'Alabama',
        fiscalYear: 2024,
        agencyId: 1,
        scope: 'state',
        obligatedAmount: 500000,
        awardCount: 10,
        population: 5000000,
        perCapita: 100,
      } as GeoSpendingSnapshot,
    ];
    jest.spyOn(service, 'queryStates').mockResolvedValue(mockResult);

    const result = await controller.getStates(2024);

    expect(result).toEqual(mockResult);
    expect(service.queryStates).toHaveBeenCalledWith({ fiscalYear: 2024 });
  });

  it('should query states with fiscalYear and agencyId', async () => {
    const mockResult: GeoSpendingSnapshot[] = [];
    jest.spyOn(service, 'queryStates').mockResolvedValue(mockResult);

    const result = await controller.getStates(2024, 2);

    expect(result).toEqual(mockResult);
    expect(service.queryStates).toHaveBeenCalledWith({
      fiscalYear: 2024,
      agencyId: 2,
    });
  });

  it('should query states with scope', async () => {
    const mockResult: GeoSpendingSnapshot[] = [];
    jest.spyOn(service, 'queryStates').mockResolvedValue(mockResult);

    const result = await controller.getStates(2024, undefined, 'county');

    expect(result).toEqual(mockResult);
    expect(service.queryStates).toHaveBeenCalledWith({
      fiscalYear: 2024,
      scope: 'county',
    });
  });

  it('should query states without agencyId for combined-agency data', async () => {
    const mockResult: GeoSpendingSnapshot[] = [];
    jest.spyOn(service, 'queryStates').mockResolvedValue(mockResult);

    const result = await controller.getStates(2024);

    expect(result).toEqual(mockResult);
    expect(service.queryStates).toHaveBeenCalledWith({ fiscalYear: 2024 });
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
    jest.spyOn(service, 'getStateDetail').mockResolvedValue(mockResult);

    const result = await controller.getStateDetail('CA');

    expect(result).toEqual(mockResult);
    expect(service.getStateDetail).toHaveBeenCalledWith('CA');
  });
});
