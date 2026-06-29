import { Component, Input } from '@angular/core';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';

export interface ChartDataset {
  label: string;
  data: number[];
}

@Component({
  selector: 'app-bar-chart',
  templateUrl: './bar-chart.component.html',
  styleUrls: ['./bar-chart.component.css'],
  standalone: true,
  imports: [BaseChartDirective],
  providers: [provideCharts(withDefaultRegisterables())]
})
export class BarChartComponent {
  @Input() labels: string[] = [];
  @Input() datasets: ChartDataset[] = [];
  @Input() title: string = '';
  @Input() horizontal: boolean = false;

  get chartData() {
    return {
      labels: this.labels,
      datasets: this.datasets
    };
  }

  get chartOptions() {
    return {
      indexAxis: (this.horizontal ? 'y' : 'x') as 'x' | 'y'
    };
  }

  readonly chartType = 'bar';
}