import { Module } from '@nestjs/common';
import { AppModule } from './app.module';

describe('AppModule', () => {
  interface TestCase {
    name: string;
  }

  const testTable: TestCase[] = [
    {
      name: 'is a class decorated with @Module',
    },
  ];

  it.each(testTable)('$name', ({ name }) => {
    expect(AppModule).toBeInstanceOf(Function);
    const moduleMetadata = Reflect.getMetadata('imports', AppModule);
    const moduleControllers = Reflect.getMetadata('controllers', AppModule);
    const moduleProviders = Reflect.getMetadata('providers', AppModule);
    expect(moduleMetadata).toBeDefined();
    expect(moduleControllers).toBeDefined();
    expect(moduleProviders).toBeDefined();
  });
});