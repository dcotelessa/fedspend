import * as fs from 'fs';
import * as yaml from 'js-yaml';

interface ServiceConfig {
  type: 'web' | 'static';
  name: string;
  buildCommand?: string;
  startCommand?: string;
  staticPublishPath?: string;
  envVars?: Array<{ key: string; value: string }>;
}

interface DatabaseConfig {
  name: string;
  plan: string;
}

interface RenderYaml {
  services: ServiceConfig[];
  databases: DatabaseConfig[];
}

const YAML_PATH = __dirname + '/../../render.yaml';

describe('render.yaml', () => {
  let parsed: RenderYaml;

  beforeAll(() => {
    const raw = fs.readFileSync(YAML_PATH, 'utf-8');
    parsed = yaml.load(raw) as RenderYaml;
  });

  it('parses yaml without error', () => {
    expect(parsed).toBeDefined();
    expect(parsed.services).toBeDefined();
    expect(parsed.databases).toBeDefined();
  });

  it('has fedspend-api web service', () => {
    const api = parsed.services.find(s => s.name === 'fedspend-api');
    expect(api).toBeDefined();
    expect(api?.type).toBe('web');
  });

  it('has fedspend-ui static service', () => {
    const ui = parsed.services.find(s => s.name === 'fedspend-ui');
    expect(ui).toBeDefined();
    expect(ui?.type).toBe('static');
  });

  it('has fedspend-db database', () => {
    const db = parsed.databases.find(d => d.name === 'fedspend-db');
    expect(db).toBeDefined();
    expect(db?.plan).toBe('free');
  });

  it('web service buildCommand uses pnpm', () => {
    const api = parsed.services.find(s => s.name === 'fedspend-api');
    expect(api?.buildCommand).toContain('pnpm');
  });

  it('web service has startCommand', () => {
    const api = parsed.services.find(s => s.name === 'fedspend-api');
    expect(api?.startCommand).toBeDefined();
  });

  it('static service has staticPublishPath', () => {
    const ui = parsed.services.find(s => s.name === 'fedspend-ui');
    expect(ui?.staticPublishPath).toBeDefined();
  });
});
