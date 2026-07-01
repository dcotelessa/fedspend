import { computeRecoveryRatio } from './recovery-ratio';

describe('computeRecoveryRatio', () => {
  interface TestCase {
    name: string;
    femaCents: number;
    fedCents: number;
    expected: number;
  }

  const testTable: TestCase[] = [
    {
      name: 'both zero returns neutral 1.0',
      femaCents: 0,
      fedCents: 0,
      expected: 1.0,
    },
    {
      name: 'fema zero fed positive returns 0',
      femaCents: 0,
      fedCents: 50000,
      expected: 0,
    },
    {
      name: 'fema positive fed zero returns 0',
      femaCents: 50000,
      fedCents: 0,
      expected: 0,
    },
    {
      name: 'both positive returns fed divided by fema',
      femaCents: 50000,
      fedCents: 125000,
      expected: 2.5,
    },
    {
      name: 'equal amounts returns 1.0',
      femaCents: 30000,
      fedCents: 30000,
      expected: 1.0,
    },
    {
      name: 'both positive fed less than fema returns fraction under 1',
      femaCents: 40000,
      fedCents: 10000,
      expected: 0.25,
    },
    {
      name: 'boundary fema 1 fed MAX_SAFE_INTEGER no overflow',
      femaCents: 1,
      fedCents: Number.MAX_SAFE_INTEGER,
      expected: Number.MAX_SAFE_INTEGER,
    },
    {
      name: 'boundary fema MAX_SAFE_INTEGER fed 1 returns near zero',
      femaCents: Number.MAX_SAFE_INTEGER,
      fedCents: 1,
      expected: 1 / Number.MAX_SAFE_INTEGER,
    },
    {
      name: 'NaN femaCents returns 0',
      femaCents: NaN,
      fedCents: 50000,
      expected: 0,
    },
    {
      name: 'NaN fedCents returns 0',
      femaCents: 50000,
      fedCents: NaN,
      expected: 0,
    },
    {
      name: 'both NaN returns 0',
      femaCents: NaN,
      fedCents: NaN,
      expected: 0,
    },
  ];

  it.each(testTable)('$name', ({ femaCents, fedCents, expected }) => {
    expect(computeRecoveryRatio(femaCents, fedCents)).toBe(expected);
  });
});
