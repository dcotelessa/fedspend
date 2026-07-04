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
      stacked: boolean;
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
        stacked: false,
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
          plugins: {
            title: { display: true, text: 'Test Chart' },
          },
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
        stacked: false,
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
          plugins: {
            title: { display: true, text: 'Test Chart' },
          },
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
        stacked: false,
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
          plugins: {
            title: { display: true, text: 'Multiple Dataset Chart' },
          },
        },
      },
    },
    {
      name: 'defaults stacked to false so existing callers render grouped bars',
      input: {
        labels: ['2022', '2023'],
        datasets: [
          { label: 'Contracts', data: [100000, 150000] },
          { label: 'Grants', data: [200000, 250000] },
        ],
        title: 'Awards by Year',
        horizontal: false,
        stacked: false,
      },
      expected: {
        chartType: 'bar',
        chartData: {
          labels: ['2022', '2023'],
          datasets: [
            { label: 'Contracts', data: [100000, 150000] },
            { label: 'Grants', data: [200000, 250000] },
          ],
        },
        chartOptions: {
          indexAxis: 'x',
          maintainAspectRatio: false,
          plugins: {
            title: { display: true, text: 'Awards by Year' },
          },
        },
      },
    },
    {
      name: 'sets scales stacked when stacked input is true',
      input: {
        labels: ['2022', '2023'],
        datasets: [
          { label: 'Contracts', data: [100000, 150000] },
          { label: 'Grants', data: [200000, 250000] },
        ],
        title: 'Stacked Awards',
        horizontal: false,
        stacked: true,
      },
      expected: {
        chartType: 'bar',
        chartData: {
          labels: ['2022', '2023'],
          datasets: [
            { label: 'Contracts', data: [100000, 150000] },
            { label: 'Grants', data: [200000, 250000] },
          ],
        },
        chartOptions: {
          indexAxis: 'x',
          maintainAspectRatio: false,
          scales: {
            x: { stacked: true },
            y: { stacked: true },
          },
          plugins: {
            title: { display: true, text: 'Stacked Awards' },
          },
        },
      },
    },
    {
      name: 'includes title in plugins when provided',
      input: {
        labels: ['2022', '2023'],
        datasets: [
          { label: 'Contracts', data: [100000, 150000] },
          { label: 'Grants', data: [200000, 250000] },
        ],
        title: 'Spending by Fiscal Year',
        horizontal: false,
        stacked: false,
      },
      expected: {
        chartType: 'bar',
        chartData: {
          labels: ['2022', '2023'],
          datasets: [
            { label: 'Contracts', data: [100000, 150000] },
            { label: 'Grants', data: [200000, 250000] },
          ],
        },
        chartOptions: {
          indexAxis: 'x',
          maintainAspectRatio: false,
          plugins: {
            title: { display: true, text: 'Spending by Fiscal Year' },
          },
        },
      },
    },
    {
      name: 'omits title plugin when title is empty string',
      input: {
        labels: ['Jan'],
        datasets: [{ label: 'D1', data: [10] }],
        title: '',
        horizontal: false,
        stacked: false,
      },
      expected: {
        chartType: 'bar',
        chartData: {
          labels: ['Jan'],
          datasets: [{ label: 'D1', data: [10] }],
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
    component.stacked = input.stacked;

    expect(component.chartType).toEqual(expected.chartType);
    expect(component.chartData).toEqual(expected.chartData);
    expect(component.chartOptions).toEqual(expected.chartOptions);
  });
});
