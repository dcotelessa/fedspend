import { Component, input, computed } from '@angular/core';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';

export interface ChartDataset {
  label: string;
  data: number[];
}

@Component({
  selector: 'app-bar-chart',
  templateUrl: './bar-chart.component.html',
  styles: [`
    .bar-chart-container {
      position: relative;
      height: 350px;
      max-width: 100%;
    }
  `],
  standalone: true,
  imports: [BaseChartDirective],
  providers: [provideCharts(withDefaultRegisterables())]
})
export class BarChartComponent {
  readonly labels = input<string[]>([]);
  readonly datasets = input<ChartDataset[]>([]);
  readonly title = input('');
  readonly horizontal = input(false);
  readonly stacked = input(false);

  readonly chartOptions = computed(() => {
    const opts: Record<string, unknown> = {
      indexAxis: (this.horizontal() ? 'y' : 'x') as 'x' | 'y',
      maintainAspectRatio: false,
    };

    if (this.stacked()) {
      opts['scales'] = {
        x: { stacked: true },
        y: { stacked: true },
      };
    }

    if (this.title()) {
      opts['plugins'] = {
        title: {
          display: true,
          text: this.title(),
        },
      };
    }

    return opts;
  });

  readonly chartData = computed(() => ({
    labels: this.labels(),
    datasets: this.datasets(),
  }));

  readonly chartType = 'bar';
}
