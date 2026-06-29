import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../api.service';
import { CurrencyFormatPipe } from '../currency-format.pipe';
import { BarChartComponent, ChartDataset } from '../bar-chart/bar-chart.component';
import { AWARD_COLORS } from '../award-colors';
import { AgencySummary, SpendingRecord } from '@shared/interfaces';

interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

interface AwardTypeSum {
  [awardType: string]: number;
}

@Component({
  selector: 'app-agency-spotlight',
  templateUrl: './agency-spotlight.component.html',
  standalone: true,
  imports: [CurrencyFormatPipe, BarChartComponent, FormsModule],
})
export class AgencySpotlightComponent implements OnInit {
  readonly routeParam = inject(ActivatedRoute);
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
    this.routeParam.paramMap.subscribe(params => {
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
    const filtered = records.filter(
      r => r.fiscalYear >= this.fiscalYearStart && r.fiscalYear <= this.fiscalYearEnd,
    );

    const yearSet = new Set<number>();
    const awardTypeSet = new Set<string>();

    filtered.forEach(record => {
      yearSet.add(record.fiscalYear);
      awardTypeSet.add(record.awardTypeLabel);
    });

    const sortedYears = Array.from(yearSet).sort((a, b) => a - b);
    const sortedAwardTypes = Array.from(awardTypeSet).sort();

    this.chartData.datasets = sortedAwardTypes.map(awardType => {
      const sums = sortedYears.map(year => {
        return filtered
          .filter(r => r.fiscalYear === year && r.awardTypeLabel === awardType)
          .reduce((sum, r) => sum + r.obligatedAmount, 0);
      });

      return {
        label: awardType,
        data: sums,
      };
    });

    this.chartData.labels = sortedYears.map(String);
  }
}
