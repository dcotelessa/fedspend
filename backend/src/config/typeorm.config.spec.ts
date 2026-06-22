import { getTypeOrmConfig } from './typeorm.config';
import * as fs from 'fs';

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  mkdirSync: jest.fn(),
}));

describe('getTypeOrmConfig', () => {
  interface TestCase {
    name: string;
    databaseUrl: string | undefined;
    expectedType: 'postgres' | 'better-sqlite3';
    expectMkdirSync: boolean;
  }

  const testTable: TestCase[] = [
    {
      name: 'returns postgres config when DATABASE_URL is set',
      databaseUrl: 'postgres://user:pass@localhost/db',
      expectedType: 'postgres',
      expectMkdirSync: false,
    },
    {
      name: 'returns sqlite config when DATABASE_URL is unset',
      databaseUrl: undefined,
      expectedType: 'better-sqlite3',
      expectMkdirSync: true,
    },
  ];

  it.each(testTable)('$name', ({ databaseUrl, expectedType, expectMkdirSync }) => {
    const configService = { get: (key: string) => databaseUrl } as any;
    const config = getTypeOrmConfig(configService);

    expect(config.type).toBe(expectedType);
    expect(fs.mkdirSync).toHaveBeenCalledTimes(expectMkdirSync ? 1 : 0);

    if (databaseUrl === undefined) {
      expect(fs.mkdirSync).toHaveBeenCalledWith('data', { recursive: true });
    }

    if (databaseUrl) {
      expect(config.type).toBe('postgres');
      expect(config.url).toBe(databaseUrl);
    } else {
      expect(config.type).toBe('better-sqlite3');
      expect(config.database).toBe('./data/dev.db');
    }
  });
});
