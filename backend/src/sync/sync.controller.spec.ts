import { Test, TestingModule } from '@nestjs/testing';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';

describe('SyncController', () => {
  let controller: SyncController;
  let mockSyncService: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockSyncService = {
      syncAll: jest.fn(),
      syncAgenciesAndSpending: jest.fn(),
      syncGeography: jest.fn(),
      syncDisaster: jest.fn(),
      getStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SyncController],
      providers: [{ provide: SyncService, useValue: mockSyncService }],
    }).compile();

    controller = module.get<SyncController>(SyncController);
  });

  interface TestCase {
    name: string;
    controllerMethod: string;
    serviceMethod: string;
    isAsync: boolean;
    serviceReturn: unknown;
    expected: unknown;
  }

  const statusMap = new Map([
    [
      'agencies_and_spending',
      {
        module: 'agencies_and_spending',
        lastSyncAt: new Date(0),
        status: 'success' as const,
      },
    ],
  ]);

  const testTable: TestCase[] = [
    {
      name: 'POST /sync delegates to syncService.syncAll with no args and returns its result',
      controllerMethod: 'syncAll',
      serviceMethod: 'syncAll',
      isAsync: true,
      serviceReturn: undefined,
      expected: undefined,
    },
    {
      name: 'POST /sync/agencies delegates to syncService.syncAgenciesAndSpending with no args and returns its result',
      controllerMethod: 'syncAgenciesAndSpending',
      serviceMethod: 'syncAgenciesAndSpending',
      isAsync: true,
      serviceReturn: undefined,
      expected: undefined,
    },
    {
      name: 'POST /sync/geography delegates to syncService.syncGeography with no args and returns its result',
      controllerMethod: 'syncGeography',
      serviceMethod: 'syncGeography',
      isAsync: true,
      serviceReturn: undefined,
      expected: undefined,
    },
    {
      name: 'POST /sync/disaster delegates to syncService.syncDisaster with no args and returns its result',
      controllerMethod: 'syncDisaster',
      serviceMethod: 'syncDisaster',
      isAsync: true,
      serviceReturn: undefined,
      expected: undefined,
    },
    {
      name: 'GET /sync/status delegates to syncService.getStatus with no args and returns the status map',
      controllerMethod: 'getStatus',
      serviceMethod: 'getStatus',
      isAsync: false,
      serviceReturn: statusMap,
      expected: statusMap,
    },
  ];

  it.each(testTable)('$name', async ({
    controllerMethod,
    serviceMethod,
    isAsync,
    serviceReturn,
    expected,
  }) => {
    const mock = mockSyncService[serviceMethod];
    if (isAsync) {
      mock.mockResolvedValue(serviceReturn);
    } else {
      mock.mockReturnValue(serviceReturn);
    }

    const result = isAsync
      ? await (controller as any)[controllerMethod]()
      : (controller as any)[controllerMethod]();

    expect(mock).toHaveBeenCalledTimes(1);
    expect(mock).toHaveBeenCalledWith();
    expect(result).toEqual(expected);
  });
});
