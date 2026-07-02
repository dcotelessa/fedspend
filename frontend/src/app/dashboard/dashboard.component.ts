import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { MatIconModule } from '@angular/material/icon';
import { CurrencyFormatPipe } from '../currency-format.pipe';
import { ApiService } from '../api.service';

export interface ChartDataset {
  label: string;
  data: number[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [BaseChartDirective, CurrencyFormatPipe, RouterLink, MatIconModule],
  providers: [provideCharts(withDefaultRegisterables())],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  totalObligated = 0;
  largestAgency: { name: string; totalCents: number } | null = null;
  coverageGapCount = 0;
  lastSync: string | null = null;

  chartLabels: string[] = [];
  chartDatasets: ChartDataset[] = [];
  chartAgencyIds: number[] = [];

  private agencies: Array<{ id: number; name: string; totalCents: number }> = [];

  private static readonly TOP_N = 5;

  constructor(
    private readonly api: ApiService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.api.getAgencies().subscribe(
      agencies => {
        this.agencies = agencies;
        this.totalObligated = agencies.reduce((sum, a) => sum + a.totalCents, 0);
        const largest = agencies.reduce<{ name: string; totalCents: number } | null>(
          (best, a) => (!best || a.totalCents > best.totalCents ? a : best),
          null,
        );
        this.largestAgency = largest ? { name: largest.name, totalCents: largest.totalCents } : null;
        this.buildChart(this.agencies);
      },
    );

    this.api.getDisasterRecoveryRatios({}).subscribe(
      ratios => {
        const gapStates = new Set(ratios.filter(r => r.recoveryRatio < 0.5).map(r => r.stateCode));
        this.coverageGapCount = gapStates.size;
      },
    );

    this.api.getLastSync().subscribe(
      ts => { this.lastSync = ts; },
    );
  }

  buildChart(agencies: Array<{ id: number; name: string; totalCents: number }>): void {
    const withData = agencies.filter(a => a.totalCents > 0);
    const sorted = [...withData].sort((a, b) => b.totalCents - a.totalCents);
    const top = sorted.slice(0, DashboardComponent.TOP_N);
    const otherTotal = sorted.length > DashboardComponent.TOP_N
      ? sorted.slice(DashboardComponent.TOP_N).reduce((sum, a) => sum + a.totalCents, 0)
      : sorted.reduce((sum, a) => sum + a.totalCents, 0);
    const labels = top.map(a => a.name).concat(['Other']);
    const data = top.map(a => a.totalCents).concat([otherTotal]);
    this.chartLabels = labels;
    this.chartDatasets = [{ label: 'Obligated (cents)', data }];
    this.chartAgencyIds = top.map(a => a.id);
  }

  onChartClick(event: any): void {
    const clicked = event.active[0];
    if (!clicked) return;
    const index = clicked.index;
    if (index < this.chartAgencyIds.length) {
      this.router.navigate(['/agencies', this.chartAgencyIds[index]]);
    }
  }

  onNavClick(route: string, event: Event): void {
    event.preventDefault();
    this.router.navigate([route]);
  }
}
