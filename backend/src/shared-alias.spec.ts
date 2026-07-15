import { AgencySummary } from '@shared/interfaces';

describe('shared-alias', () => {
  interface TestCase {
    name: string;
    expectedShape: Partial<AgencySummary>;
  }

  const testTable: TestCase[] = [
    {
      name: 'AgencySummary interface is defined with expected shape',
      expectedShape: {
        agency: { id: 0, name: '', abbreviation: '', toptierCode: '' },
        currentFyTotal: 0,
        priorFyTotal: 0,
        yoyChange: 0,
      },
    },
  ];

  it.each(testTable)('$name', ({ expectedShape }) => {
    expect(expectedShape).toBeDefined();
    expect(expectedShape.agency).toBeDefined();
    expect(typeof expectedShape.currentFyTotal).toBe('number');
    expect(typeof expectedShape.priorFyTotal).toBe('number');
    expect(typeof expectedShape.yoyChange).toBe('number');
  });
});
