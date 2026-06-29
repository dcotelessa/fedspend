import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../api.service';
import { CurrencyFormatPipe } from '../currency-format.pipe';
import { BarChartComponent, ChartDataset } from '../bar-chart/bar-chart.component';
import { AgencySummary, SpendingRecord } from '@shared/interfaces';

interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

@Component({
  selector: 'app-agency-spotlight',
  templateUrl: './agency-spotlight.component.html',
  standalone: true,
  imports: [CurrencyFormatPipe, BarChartComponent, FormsModule],
})
export class AgencySpotlightComponent implements OnInit {
  readonly route = inject(ActivatedRoute);
  readonly apiService = inject(ApiService);

  agency: AgencySummary | null = null;
  loading = true;
  error = '';
  badgeColor = 'Neutral';
  badgeText = '';
  fiscalYearStart = 2020;
  fiscalYearEnd = 2024;
  availableYears: number[] = [];
  chartData: ChartData = { labels: [], datasets: [] };

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.apiService.getAgencySpotlight(Number(id)).subscribe({
          next: (records) => {
            this.loading = false;
            if (records && records.length > 0) {
              this.currentRecords = records;
              this.buildStackedChartFromRecords(records);
            }
          },
          error: () => {
            this.error = 'Failed to load agency data';
            this.loading = false;
          },
        });
      }
    });
  }

  onRangeChange(): void {
    this.buildStackedChartFromRecords(this.currentRecords);
  }

  private currentRecords: SpendingRecord[] = [];

  private buildStackedChartFromRecords(records: SpendingRecord[]): void {
    const inRange = records.filter(
      r => r.fiscalYear >= this.fiscalYearStart && r.fiscalYear <= this.fiscalYearEnd,
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

    this.chartData.labels = sortedYears.map(String);
    this.chartData.datasets = sortedAwardTypes.map(awardType => {
      const sumsByYear = sumsByAwardType.get(awardType)!;
      return {
        label: awardType,
        data: sortedYears.map(year => sumsByYear.get(year) ?? 0),
      };
    });
  }
}
