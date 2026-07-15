import { execSync } from 'child_process';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

interface TestCase {
  name: string;
  check: (buildDir: string) => boolean;
}

const testTable: TestCase[] = [
  {
    name: 'dist/frontend/browser/_redirects exists after build',
    check: (buildDir: string) => {
      const filePath = join(buildDir, 'frontend', 'browser', '_redirects');
      if (!existsSync(filePath)) {
        return false;
      }
      const content = readFileSync(filePath, 'utf-8');
      return content.includes('/index.html') && content.includes('302');
    },
  },
  {
    name: 'prod bundle has no hardcoded localhost:3000 (uses relative /api)',
    check: (buildDir: string) => {
      const browserDir = join(buildDir, 'frontend', 'browser');
      if (!existsSync(browserDir)) return false;
      const jsFiles = readdirSync(browserDir).filter(f => f.endsWith('.js'));
      return !jsFiles.some(f => readFileSync(join(browserDir, f), 'utf-8').includes('localhost:3000'));
    },
  },
];

function runBuild(): string {
  return execSync('pnpm build 2>&1', { cwd: __dirname, encoding: 'utf-8' });
}

function getBuildDir(): string {
  return join(__dirname, 'dist');
}

describe('Frontend production build outputs _redirects', () => {
  let buildDir: string;

  beforeEach(() => {
    runBuild();
    buildDir = getBuildDir();
  });

  it.each(testTable)('$name', ({ check }) => {
    expect(check(buildDir)).toBe(true);
  });
});
