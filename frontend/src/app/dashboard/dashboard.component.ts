import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { MatIconModule } from '@angular/material/icon';
import { CurrencyFormatPipe } from '../currency-format.pipe';
import { ApiService } from '../api.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { DisasterOverview, DisasterRecoveryRatio } from '@shared/interfaces';

export interface ChartDataset {
  label: string;
  data: number[];
}

type AgencyWithTotal = { id: number; name: string; totalCents: number };

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [BaseChartDirective, CurrencyFormatPipe, RouterLink, MatIconModule],
  providers: [provideCharts(withDefaultRegisterables())],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  private static readonly TOP_N = 5;

  private readonly agencies = toSignal(this.api.getAgencies(), {
    initialValue: [] as AgencyWithTotal[],
  });
  private readonly overview = toSignal(this.api.getDisasterOverview({}), {
    initialValue: [] as DisasterOverview[],
  });
  private readonly ratios = toSignal(this.api.getDisasterRecoveryRatios({}), {
    initialValue: [] as DisasterRecoveryRatio[],
  });
  readonly lastSync = toSignal(this.api.getLastSync(), {
    initialValue: null as string | null,
  });

  readonly disasterTotal = computed(() =>
    this.overview().reduce((sum, r) => sum + r.totalObligated, 0),
  );

  readonly totalObligated = computed(() =>
    this.agencies().reduce((sum, a) => sum + a.totalCents, 0) + this.disasterTotal(),
  );

  readonly largestAgency = computed<{ name: string; totalCents: number } | null>(() => {
    const list = this.agencies();
    if (list.length === 0) return null;
    const largest = list.reduce<{ name: string; totalCents: number } | null>(
      (best, a) => (!best || a.totalCents > best.totalCents ? a : best),
      null,
    );
    return largest ? { name: largest.name, totalCents: largest.totalCents } : null;
  });

  readonly coverageGapCount = computed(() => {
    const gapStates = new Set(
      this.ratios().filter(r => r.recoveryRatio < 0.5).map(r => r.stateCode),
    );
    return gapStates.size;
  });

  private readonly topAgencies = computed(() => {
    const withData = this.agencies().filter(a => a.totalCents > 0);
    return [...withData]
      .sort((a, b) => b.totalCents - a.totalCents)
      .slice(0, DashboardComponent.TOP_N);
  });

  readonly chartLabels = computed(() =>
    this.topAgencies().map(a => a.name).concat(['Disaster Spending']),
  );

  readonly chartDatasets = computed<ChartDataset[]>(() => [
    {
      label: 'Obligated (cents)',
      data: this.topAgencies().map(a => a.totalCents).concat([this.disasterTotal()]),
    },
  ]);

  readonly chartAgencyIds = computed(() => this.topAgencies().map(a => a.id));

  readonly chartData = computed(() => ({
    labels: this.chartLabels(),
    datasets: this.chartDatasets(),
  }));

  readonly chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
  };

  onChartClick(event: any): void {
    const clicked = event.active[0];
    if (!clicked) return;
    const index = clicked.index;
    if (index < this.chartAgencyIds().length) {
      this.router.navigate(['/agencies', this.chartAgencyIds()[index]]);
    }
  }

  onNavClick(route: string, event: Event): void {
    event.preventDefault();
    this.router.navigate([route]);
  }
}
