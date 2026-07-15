import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ApiService } from '../api.service';
import { CurrencyFormatPipe } from '../currency-format.pipe';
import { BarChartComponent, ChartDataset } from '../bar-chart/bar-chart.component';
import { AgencySummary, SpendingRecord } from '@shared/interfaces';
import { catchError, filter, map, of, switchMap } from 'rxjs';

interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

interface TableDataRow {
  awardType: string;
  obligatedAmount: number;
  percentageOfTotal: number;
}

@Component({
  selector: 'app-agency-spotlight',
  templateUrl: './agency-spotlight.component.html',
  styleUrl: './agency-spotlight.component.scss',
  standalone: true,
  imports: [CurrencyFormatPipe, BarChartComponent, FormsModule, MatSelectModule, MatFormFieldModule, MatTableModule, RouterLink, MatButtonModule, MatIconModule],
})
export class AgencySpotlightComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly apiService = inject(ApiService);

  private readonly agencyId = toSignal(
    this.route.paramMap.pipe(map(p => p.get('id'))),
    { initialValue: null as string | null },
  );

  readonly agency = toSignal(
    toObservable(this.agencyId).pipe(
      filter((id): id is string => id !== null),
      switchMap(id => this.apiService.getAgencySummary(Number(id)).pipe(
        catchError(() => of(null as AgencySummary | null)),
      )),
    ),
    { initialValue: null as AgencySummary | null },
  );

  private readonly records = toSignal(
    toObservable(this.agencyId).pipe(
      filter((id): id is string => id !== null),
      switchMap(id => this.apiService.getAgencySpotlight(Number(id)).pipe(
        catchError(() => {
          this.error.set('Failed to load agency data');
          return of(null as SpendingRecord[] | null);
        }),
      )),
    ),
    { initialValue: null as SpendingRecord[] | null },
  );

  readonly error = signal('');
  readonly loading = computed(() => this.records() === null);
  readonly fiscalYearStart = signal(2020);
  readonly fiscalYearEnd = signal(2024);
  readonly displayedColumns = ['awardType', 'obligatedAmount', 'percentageOfTotal'];

  readonly availableYears = computed(() => {
    const records = this.records();
    if (!records || records.length === 0) return [2020, 2021, 2022, 2023, 2024];
    return AgencySpotlightComponent.computeAvailableYears(records).years;
  });

  readonly chartData = computed<ChartData>(() =>
    AgencySpotlightComponent.buildStackedChart(
      this.records() ?? [],
      this.fiscalYearStart(),
      this.fiscalYearEnd(),
    ),
  );

  readonly tableData = computed<TableDataRow[]>(() =>
    AgencySpotlightComponent.buildTableData(
      this.records() ?? [],
      this.fiscalYearStart(),
      this.fiscalYearEnd(),
    ),
  );

  readonly insight = computed(() =>
    AgencySpotlightComponent.computeInsight(
      this.agency(),
      this.records() ?? [],
      this.fiscalYearStart(),
      this.fiscalYearEnd(),
    ),
  );

  readonly badge = computed(() => AgencySpotlightComponent.computeBadge(this.agency()));

  constructor() {
    effect(() => {
      const records = this.records();
      if (records && records.length > 0) {
        const { start, end } = AgencySpotlightComponent.computeAvailableYears(records);
        this.fiscalYearStart.set(start);
        this.fiscalYearEnd.set(end);
      }
    });
  }

  onFiscalYearStartChange(value: number): void {
    this.fiscalYearStart.set(value);
  }

  onFiscalYearEndChange(value: number): void {
    this.fiscalYearEnd.set(value);
  }

  static computeAvailableYears(records: SpendingRecord[]): { years: number[]; start: number; end: number } {
    const years = Array.from(new Set(records.map(r => r.fiscalYear))).sort((a, b) => a - b);
    return {
      years,
      start: Math.min(...years),
      end: Math.max(...years),
    };
  }

  static buildStackedChart(records: SpendingRecord[], fiscalYearStart: number, fiscalYearEnd: number): ChartData {
    const inRange = records.filter(
      r => r.fiscalYear >= fiscalYearStart && r.fiscalYear <= fiscalYearEnd,
    );

    const years = new Set<number>();
    const sumsByAwardType = new Map<string, Map<number, number>>();
    for (const record of inRange) {
      years.add(record.fiscalYear);
      let sumsByYear = sumsByAwardType.get(record.awardTypeLabel);
      if (!sumsByYear) {
        sumsByYear = new Map<number, number>();
        sumsByAwardType.set(record.awardTypeLabel, sumsByYear);
      }
      sumsByYear.set(
        record.fiscalYear,
        (sumsByYear.get(record.fiscalYear) ?? 0) + record.obligatedAmount,
      );
    }

    const sortedYears = Array.from(years).sort((a, b) => a - b);
    const sortedAwardTypes = Array.from(sumsByAwardType.keys()).sort();

    return {
      labels: sortedYears.map(String),
      datasets: sortedAwardTypes.map(awardType => {
        const sumsByYear = sumsByAwardType.get(awardType)!;
        return {
          label: awardType,
          data: sortedYears.map(year => sumsByYear.get(year) ?? 0),
        };
      }),
    };
  }

  static aggregateAwardTypesForRange(records: SpendingRecord[], fiscalYearStart: number, fiscalYearEnd: number): {
    sumsByType: Map<string, number>;
    total: number;
  } {
    const sumsByType = new Map<string, number>();
    let total = 0;
    for (const r of records) {
      if (r.fiscalYear < fiscalYearStart || r.fiscalYear > fiscalYearEnd) continue;
      sumsByType.set(r.awardTypeLabel, (sumsByType.get(r.awardTypeLabel) ?? 0) + r.obligatedAmount);
      total += r.obligatedAmount;
    }
    return { sumsByType, total };
  }

  static computeInsight(agency: AgencySummary | null, records: SpendingRecord[], fiscalYearStart: number, fiscalYearEnd: number): string {
    if (!agency) {
      return 'No data available for the selected fiscal year.';
    }

    const { sumsByType, total } = AgencySpotlightComponent.aggregateAwardTypesForRange(records, fiscalYearStart, fiscalYearEnd);
    if (total === 0) {
      return 'No data available for the selected fiscal year.';
    }

    let maxType = '';
    let maxValue = 0;
    for (const [type, value] of sumsByType) {
      if (value > maxValue) {
        maxValue = value;
        maxType = type;
      }
    }

    const pct = (maxValue / total * 100).toFixed(1);
    const agencyName = agency.agency?.name || '';
    return `In FY${fiscalYearStart}-${fiscalYearEnd}, ${agencyName} spent ${pct}% on ${maxType}.`;
  }

  static buildTableData(records: SpendingRecord[], fiscalYearStart: number, fiscalYearEnd: number): TableDataRow[] {
    const { sumsByType, total } = AgencySpotlightComponent.aggregateAwardTypesForRange(records, fiscalYearStart, fiscalYearEnd);

    return Array.from(sumsByType.entries())
      .map(([awardType, obligated]) => ({
        awardType,
        obligatedAmount: obligated,
        percentageOfTotal: total > 0 ? Math.round(obligated / total * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.obligatedAmount - a.obligatedAmount);
  }

  static computeBadge(agency: AgencySummary | null): { color: string; text: string } {
    if (!agency) return { color: 'neutral', text: '0.0% YoY' };

    const { priorFyTotal, yoyChange } = agency;
    if (priorFyTotal === 0) {
      return { color: 'neutral', text: '0.0% YoY' };
    }
    if (yoyChange >= 0) {
      return { color: 'positive', text: `+${yoyChange.toFixed(1)}% YoY` };
    }
    return { color: 'negative', text: `${yoyChange.toFixed(1)}% YoY` };
  }
}
