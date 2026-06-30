import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  interface TestCase {
    name: string;
    storedValue: string | null;
    operations: Array<{ method: 'toggle' }>;
    expectedIsDark: boolean;
    expectedStorage: string | null;
  }

  const STORAGE_KEY = 'fedspend-theme';

  const testTable: TestCase[] = [
    {
      name: 'defaults to dark=false when nothing in storage',
      storedValue: null,
      operations: [],
      expectedIsDark: false,
      expectedStorage: null,
    },
    {
      name: 'defaults to dark=false when storage has non-true value',
      storedValue: 'false',
      operations: [],
      expectedIsDark: false,
      expectedStorage: 'false',
    },
    {
      name: 'restores dark=true from storage',
      storedValue: 'true',
      operations: [],
      expectedIsDark: true,
      expectedStorage: 'true',
    },
    {
      name: 'toggle flips dark=false to dark=true',
      storedValue: null,
      operations: [{ method: 'toggle' }],
      expectedIsDark: true,
      expectedStorage: 'true',
    },
    {
      name: 'toggle flips dark=true to dark=false',
      storedValue: 'true',
      operations: [{ method: 'toggle' }],
      expectedIsDark: false,
      expectedStorage: 'false',
    },
    {
      name: 'toggle from dark=false twice returns to dark=false',
      storedValue: null,
      operations: [{ method: 'toggle' }, { method: 'toggle' }],
      expectedIsDark: false,
      expectedStorage: 'false',
    },
    {
      name: 'toggle from dark=true twice returns to dark=true',
      storedValue: 'true',
      operations: [{ method: 'toggle' }, { method: 'toggle' }],
      expectedIsDark: true,
      expectedStorage: 'true',
    },
    {
      name: 'persist isDark$ matches storage after toggle',
      storedValue: 'false',
      operations: [{ method: 'toggle' }],
      expectedIsDark: true,
      expectedStorage: 'true',
    },
  ];

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  it.each(testTable)('$name', ({ storedValue, operations, expectedIsDark, expectedStorage }) => {
    if (storedValue !== null) {
      localStorage.setItem(STORAGE_KEY, storedValue);
    }
    const service = TestBed.inject(ThemeService);

    for (const op of operations) {
      if (op.method === 'toggle') {
        service.toggle();
      }
    }

    expect(service.isDark$()).toBe(expectedIsDark);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(expectedStorage);
  });
});
