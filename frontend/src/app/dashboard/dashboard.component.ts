import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { CurrencyFormatPipe } from '../currency-format.pipe';
import { ApiService } from '../api.service';

export interface ChartDataset {
  label: string;
  data: number[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [BaseChartDirective, CurrencyFormatPipe],
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

  private agencies: Array<{ id: number; name: string; totalCents: number }> = [];

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
        this.chartLabels = agencies.map(a => a.name);
        this.chartDatasets = [{ label: 'Obligated (cents)', data: agencies.map(a => a.totalCents) }];
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

  onChartClick(event: any): void {
    const clicked = event.active[0];
    if (!clicked) return;
    const agency = this.agencies[clicked.datasetIndex];
    if (!agency) return;
    this.router.navigate(['/agencies', agency.id]);
  }
}
