import { Component, Input } from '@angular/core';
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
  @Input() labels: string[] = [];
  @Input() datasets: ChartDataset[] = [];
  @Input() title: string = '';
  @Input() horizontal: boolean = false;
  @Input() stacked: boolean = false;

  get chartOptions() {
    const opts: Record<string, unknown> = {
      indexAxis: (this.horizontal ? 'y' : 'x') as 'x' | 'y',
      maintainAspectRatio: false,
    };

    if (this.stacked) {
      opts['scales'] = {
        x: { stacked: true },
        y: { stacked: true },
      };
    }

    if (this.title) {
      opts['plugins'] = {
        title: {
          display: true,
          text: this.title,
        },
      };
    }

    return opts;
  }

  get chartData() {
    return {
      labels: this.labels,
      datasets: this.datasets
    };
  }

  readonly chartType = 'bar';
}