import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  interface TestCase {
    name: string;
  }

  const testTable: TestCase[] = [
    { name: 'creates the root component' },
  ];

  it.each(testTable)('$name', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
