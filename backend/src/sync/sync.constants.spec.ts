import { TRACKED_AGENCIES, AWARD_TYPES, DEF_GROUP_MAP } from './sync.constants';

describe('Sync Constants', () => {
  interface TestCase {
    name: string;
    input: any;
    expected: any;
  }

  describe('TRACKED_AGENCIES', () => {
    const testTable: TestCase[] = [
      {
        name: 'has exactly 6 agencies',
        input: TRACKED_AGENCIES,
        expected: 6
      },
      {
        name: 'each agency has abbreviation and id',
        input: TRACKED_AGENCIES,
        expected: true
      },
      {
        name: 'contains NASA with id 080',
        input: TRACKED_AGENCIES,
        expected: { abbreviation: 'NASA', id: '080' }
      },
      {
        name: 'contains GSA with id 047',
        input: TRACKED_AGENCIES,
        expected: { abbreviation: 'GSA', id: '047' }
      },
      {
        name: 'contains OPM with id 024',
        input: TRACKED_AGENCIES,
        expected: { abbreviation: 'OPM', id: '024' }
      },
      {
        name: 'contains LOC with id 036',
        input: TRACKED_AGENCIES,
        expected: { abbreviation: 'LOC', id: '036' }
      },
      {
        name: 'contains HHS with id 075',
        input: TRACKED_AGENCIES,
        expected: { abbreviation: 'HHS', id: '075' }
      },
      {
        name: 'contains FDIC with id 581',
        input: TRACKED_AGENCIES,
        expected: { abbreviation: 'FDIC', id: '581' }
      }
    ];

    it.each(testTable)('$name', ({ input, expected }) => {
      if (expected === 6) {
        expect(input.length).toBe(expected);
      } else if (expected === true) {
        expect(input.every((agency: any) => agency.abbreviation && agency.id)).toBe(true);
      } else {
        expect(input).toContainEqual(expected);
      }
    });
  });

  describe('AWARD_TYPES', () => {
    const testTable: TestCase[] = [
      {
        name: 'has exactly 5 award types',
        input: AWARD_TYPES,
        expected: 5
      },
      {
        name: 'contains Contracts',
        input: AWARD_TYPES,
        expected: 'Contracts'
      },
      {
        name: 'contains Grants',
        input: AWARD_TYPES,
        expected: 'Grants'
      },
      {
        name: 'contains Direct Payments',
        input: AWARD_TYPES,
        expected: 'Direct Payments'
      },
      {
        name: 'contains Loans',
        input: AWARD_TYPES,
        expected: 'Loans'
      },
      {
        name: 'contains IDVs',
        input: AWARD_TYPES,
        expected: 'IDVs'
      }
    ];

    it.each(testTable)('$name', ({ input, expected }) => {
      if (expected === 5) {
        expect(input.length).toBe(expected);
      } else {
        expect(input).toContain(expected);
      }
    });
  });

  describe('DEF_GROUP_MAP', () => {
    const keys = Object.keys(DEF_GROUP_MAP);
    const testTable: TestCase[] = [
      {
        name: 'has exactly 2 def groups (COVID-19, Infrastructure)',
        input: keys,
        expected: 2
      },
      {
        name: 'contains COVID-19',
        input: keys,
        expected: 'COVID-19'
      },
      {
        name: 'contains Infrastructure',
        input: keys,
        expected: 'Infrastructure'
      },
      {
        name: 'COVID-19 maps to an array of DEF codes',
        input: DEF_GROUP_MAP['COVID-19'],
        expected: 'L'
      },
      {
        name: 'Infrastructure maps to an array of DEF codes',
        input: DEF_GROUP_MAP['Infrastructure'],
        expected: '1'
      }
    ];

    it.each(testTable)('$name', ({ input, expected }) => {
      if (expected === 2) {
        expect(input.length).toBe(expected);
      } else {
        expect(input).toContain(expected);
      }
    });
  });
});