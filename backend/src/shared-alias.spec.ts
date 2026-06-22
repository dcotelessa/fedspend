import { ApiResponse } from '@shared/interfaces';

describe('shared-alias', () => {
  interface TestCase {
    name: string;
    expectedShape: Partial<ApiResponse<unknown>>;
  }

  const testTable: TestCase[] = [
    {
      name: 'ApiResponse interface is defined with expected shape',
      expectedShape: {
        data: {},
        meta: { total: 0, page: 1, pageSize: 10 },
      },
    },
  ];

  it.each(testTable)('$name', ({ expectedShape }) => {
    expect(expectedShape).toBeDefined();
    expect(expectedShape.meta).toBeDefined();
    expect(typeof expectedShape.meta?.total).toBe('number');
    expect(typeof expectedShape.meta?.page).toBe('number');
    expect(typeof expectedShape.meta?.pageSize).toBe('number');
  });
});
