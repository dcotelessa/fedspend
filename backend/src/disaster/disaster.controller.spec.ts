import { Test, TestingModule } from '@nestjs/testing';
import { DisasterController } from './disaster.controller';
import { DisasterService } from './disaster.service';

describe('DisasterController', () => {
  let controller: DisasterController;
  let service: DisasterService;

  const mockService = {
    getOverview: jest.fn(),
    queryStates: jest.fn(),
    queryRatios: jest.fn(),
    getStateProfile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DisasterController],
      providers: [
        { provide: DisasterService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<DisasterController>(DisasterController);
    service = module.get<DisasterService>(DisasterService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('calls service.getOverview and returns the result', async () => {
    const overviewData = [
      { defGroup: 'CA', totalObligated: 300000, totalAwardCount: 15, stateCount: 2, highestPerCapitaState: 'California', highestPerCapita: 1000, coverageGapCount: 1 },
      { defGroup: '01', totalObligated: 50000, totalAwardCount: 3, stateCount: 1, highestPerCapitaState: 'Florida', highestPerCapita: 200, coverageGapCount: 0 },
    ];
    mockService.getOverview.mockResolvedValue(overviewData);

    const result = await controller.getOverview();

    expect(result).toEqual(overviewData);
    expect(service.getOverview).toHaveBeenCalled();
  });

  it('calls service.queryStates with defGroup and fiscalYear query params', async () => {
    const statesData = [
      { id: 1, defGroup: 'CA', stateCode: 'CA', stateName: 'California', obligatedAmount: 200000, awardCount: 10, perCapita: 1000, population: 200 },
      { id: 2, defGroup: 'CA', stateCode: 'NY', stateName: 'New York', obligatedAmount: 100000, awardCount: 5, perCapita: 500, population: 200 },
    ];
    mockService.queryStates.mockResolvedValue(statesData);

    const result = await controller.queryStates('CA', '2024');

    expect(result).toEqual(statesData);
    expect(service.queryStates).toHaveBeenCalledWith({ defGroup: 'CA', fiscalYear: 2024 });
  });

  it('calls service.queryStates with only defGroup', async () => {
    const statesData: any[] = [];
    mockService.queryStates.mockResolvedValue(statesData);

    const result = await controller.queryStates('CA', undefined);

    expect(result).toEqual(statesData);
    expect(service.queryStates).toHaveBeenCalledWith({ defGroup: 'CA' });
  });

  it('calls service.queryRatios with fiscalYear query param and sorts ascending', async () => {
    const ratiosData = [
      { id: 1, stateCode: 'CA', stateName: 'California', fiscalYear: 2024, femaObligated: 300000, fedSpendingObligated: 100000, recoveryRatio: 0.3, declarationCount: 2, dominantIncidentType: 'Earthquake' },
      { id: 2, stateCode: 'FL', stateName: 'Florida', fiscalYear: 2024, femaObligated: 50000, fedSpendingObligated: 50000, recoveryRatio: 1.0, declarationCount: 1, dominantIncidentType: 'Hurricane' },
    ];
    mockService.queryRatios.mockResolvedValue(ratiosData);

    const result = await controller.queryRatios('2024');

    expect(result).toEqual(ratiosData);
    expect(service.queryRatios).toHaveBeenCalledWith({ fiscalYear: 2024 });
  });

  it('calls service.queryRatios with no fiscalYear', async () => {
    const ratiosData: any[] = [];
    mockService.queryRatios.mockResolvedValue(ratiosData);

    const result = await controller.queryRatios(undefined);

    expect(result).toEqual(ratiosData);
    expect(service.queryRatios).toHaveBeenCalledWith({});
  });

  it('calls service.getStateProfile with state code parameter', async () => {
    const profileData = {
      stateCode: 'NY',
      stateName: 'New York',
      totalObligated: 150000,
      totalAwardCount: 8,
      ratios: [{ recoveryRatio: 2.0, femaObligated: 100000, fedSpendingObligated: 200000, declarationCount: 1 }],
      declarationCount: 1,
    };
    mockService.getStateProfile.mockResolvedValue(profileData);

    const result = await controller.getStateProfile('NY');

    expect(result).toEqual(profileData);
    expect(service.getStateProfile).toHaveBeenCalledWith('NY');
  });

  it('returns null for getStateProfile when no data exists', async () => {
    mockService.getStateProfile.mockResolvedValue(null);

    const result = await controller.getStateProfile('ZZ');

    expect(result).toBeNull();
    expect(service.getStateProfile).toHaveBeenCalledWith('ZZ');
  });
});
