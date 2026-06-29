import { TestBed } from '@angular/core/testing';
import { LoadingService } from './loading.service';

describe('LoadingService', () => {
  interface TestCase {
    name: string;
    operations: Array<{ method: 'increment' | 'decrement' }>;
    expectedLoading: boolean;
  }

  const testTable: TestCase[] = [
    {
      name: 'starts with loading$ false',
      operations: [],
      expectedLoading: false,
    },
    {
      name: 'increment sets loading$ true',
      operations: [{ method: 'increment' }],
      expectedLoading: true,
    },
    {
      name: 'increment then decrement resets loading$ to false',
      operations: [{ method: 'increment' }, { method: 'decrement' }],
      expectedLoading: false,
    },
    {
      name: 'multiple increments keep loading$ true',
      operations: [
        { method: 'increment' },
        { method: 'increment' },
        { method: 'increment' },
      ],
      expectedLoading: true,
    },
    {
      name: 'decrementing below zero clamps to false',
      operations: [
        { method: 'decrement' },
        { method: 'decrement' },
      ],
      expectedLoading: false,
    },
    {
      name: 'increment, two decrements keeps counter at zero',
      operations: [
        { method: 'increment' },
        { method: 'decrement' },
        { method: 'decrement' },
      ],
      expectedLoading: false,
    },
    {
      name: 'increment, decrement, increment, decrement cycles correctly',
      operations: [
        { method: 'increment' },
        { method: 'decrement' },
        { method: 'increment' },
        { method: 'decrement' },
      ],
      expectedLoading: false,
    },
    {
      name: 'two increments, one decrement keeps loading$ true',
      operations: [
        { method: 'increment' },
        { method: 'increment' },
        { method: 'decrement' },
      ],
      expectedLoading: true,
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it.each(testTable)('$name', ({ operations, expectedLoading }) => {
    const service = TestBed.inject(LoadingService);
    for (const op of operations) {
      if (op.method === 'increment') {
        service.increment();
      } else {
        service.decrement();
      }
    }
    expect(service.loading$()).toBe(expectedLoading);
  });
});
