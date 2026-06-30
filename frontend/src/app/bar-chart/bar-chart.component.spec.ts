import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BarChartComponent } from './bar-chart.component';

describe('BarChartComponent', () => {
  interface TestCase {
    name: string;
    input: {
      labels: string[];
      datasets: { label: string; data: number[] }[];
      title: string;
      horizontal: boolean;
    };
    expected: {
      chartType: string;
      chartData: {
        labels: string[];
        datasets: { label: string; data: number[] }[];
      };
      chartOptions: {
        indexAxis: string;
        maintainAspectRatio: boolean;
      };
    };
  }

  const testTable: TestCase[] = [
    {
      name: 'creates vertical bar chart with correct config',
      input: {
        labels: ['Jan', 'Feb', 'Mar'],
        datasets: [{ label: 'Dataset 1', data: [10, 20, 30] }],
        title: 'Test Chart',
        horizontal: false,
      },
      expected: {
        chartType: 'bar',
        chartData: {
          labels: ['Jan', 'Feb', 'Mar'],
          datasets: [{ label: 'Dataset 1', data: [10, 20, 30] }],
        },
        chartOptions: {
          indexAxis: 'x',
          maintainAspectRatio: false,
        },
      },
    },
    {
      name: 'creates horizontal bar chart with correct config',
      input: {
        labels: ['Jan', 'Feb', 'Mar'],
        datasets: [{ label: 'Dataset 1', data: [10, 20, 30] }],
        title: 'Test Chart',
        horizontal: true,
      },
      expected: {
        chartType: 'bar',
        chartData: {
          labels: ['Jan', 'Feb', 'Mar'],
          datasets: [{ label: 'Dataset 1', data: [10, 20, 30] }],
        },
        chartOptions: {
          indexAxis: 'y',
          maintainAspectRatio: false,
        },
      },
    },
    {
      name: 'handles multiple datasets correctly',
      input: {
        labels: ['A', 'B', 'C'],
        datasets: [
          { label: 'Dataset 1', data: [1, 2, 3] },
          { label: 'Dataset 2', data: [4, 5, 6] },
        ],
        title: 'Multiple Dataset Chart',
        horizontal: false,
      },
      expected: {
        chartType: 'bar',
        chartData: {
          labels: ['A', 'B', 'C'],
          datasets: [
            { label: 'Dataset 1', data: [1, 2, 3] },
            { label: 'Dataset 2', data: [4, 5, 6] },
          ],
        },
        chartOptions: {
          indexAxis: 'x',
          maintainAspectRatio: false,
        },
      },
    },
  ];

  it.each(testTable)('$name', ({ input, expected }) => {
    const component = new BarChartComponent();
    component.labels = input.labels;
    component.datasets = input.datasets;
    component.title = input.title;
    component.horizontal = input.horizontal;

    expect(component.chartType).toEqual(expected.chartType);
    expect(component.chartData).toEqual(expected.chartData);
    expect(component.chartOptions).toEqual(expected.chartOptions);
  });
});