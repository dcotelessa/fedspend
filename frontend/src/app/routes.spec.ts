import { routes } from './app.routes';

describe('App Routes', () => {
  interface TestCase {
    name: string;
    path: string;
  }

  const testTable: TestCase[] = [
    { name: 'root path exists', path: '' },
    { name: 'geography path exists', path: 'geography' },
    { name: 'agencies path exists', path: 'agencies' },
    { name: 'agencies/:id path exists', path: 'agencies/:id' },
    { name: 'disaster path exists', path: 'disaster' },
  ];

  it.each(testTable)('$name', ({ path }) => {
    const route = routes.find(r => r.path === path);
    expect(route).toBeDefined();
    expect(route?.loadComponent).toBeDefined();
  });

  it('has exactly 5 route definitions', () => {
    expect(routes).toHaveLength(5);
  });

  it('has no duplicate paths', () => {
    const paths = routes.map(r => r.path);
    const unique = new Set(paths);
    expect(unique.size).toBe(paths.length);
  });
});