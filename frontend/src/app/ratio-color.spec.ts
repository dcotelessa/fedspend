import { getRatioColor } from './ratio-color';

describe('getRatioColor', () => {
  interface TestCase {
    name: string;
    ratio: number;
    expected: 'warn' | 'accent' | 'primary';
  }

  const testTable: TestCase[] = [
    {
      name: 'returns warn for zero ratio',
      ratio: 0,
      expected: 'warn',
    },
    {
      name: 'returns warn for ratio below 0.5',
      ratio: 0.49,
      expected: 'warn',
    },
    {
      name: 'returns accent for ratio at 0.5',
      ratio: 0.5,
      expected: 'accent',
    },
    {
      name: 'returns accent for ratio between 0.5 and 1.0',
      ratio: 0.75,
      expected: 'accent',
    },
    {
      name: 'returns accent for ratio at 1.0',
      ratio: 1.0,
      expected: 'accent',
    },
    {
      name: 'returns primary for ratio above 1.0',
      ratio: 1.01,
      expected: 'primary',
    },
    {
      name: 'returns primary for ratio well above 1.0',
      ratio: 2.5,
      expected: 'primary',
    },
  ];

  it.each(testTable)('$name', ({ ratio, expected }) => {
    expect(getRatioColor(ratio)).toBe(expected);
  });
});
