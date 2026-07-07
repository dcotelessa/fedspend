import { CurrencyFormatPipe } from './currency-format.pipe';

describe('CurrencyFormatPipe', () => {
  let pipe: CurrencyFormatPipe;

  beforeEach(() => {
    pipe = new CurrencyFormatPipe();
  });

  interface TestCase {
    name: string;
    input: number | null | undefined;
    expected: string;
  }

  const testTable: TestCase[] = [
    {
      name: 'formats zero cents as $0.00',
      input: 0,
      expected: '$0.00',
    },
    {
      name: 'formats one cent as $0.01',
      input: 1,
      expected: '$0.01',
    },
    {
      name: 'formats 99 cents as $0.99',
      input: 99,
      expected: '$0.99',
    },
    {
      name: 'formats 1500000000 cents as $15,000,000.00',
      input: 1500000000,
      expected: '$15,000,000.00',
    },
    {
      name: 'formats negative 500 cents as -$5.00',
      input: -500,
      expected: '-$5.00',
    },
    {
      name: 'formats undefined as $0.00',
      input: undefined,
      expected: '$0.00',
    },
    {
      name: 'formats null as $0.00',
      input: null,
      expected: '$0.00',
    },
  ];

  it.each(testTable)('$name', ({ input, expected }) => {
    expect(pipe.transform(input)).toEqual(expected);
  });
});