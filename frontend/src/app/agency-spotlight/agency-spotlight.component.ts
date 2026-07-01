import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatOptionModule } from '@angular/material/core';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../api.service';
import { CurrencyFormatPipe } from '../currency-format.pipe';
import { BarChartComponent, ChartDataset } from '../bar-chart/bar-chart.component';
import { AgencySummary, SpendingRecord } from '@shared/interfaces';

interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

interface TableDataRow {
  awardType: string;
  obligatedAmount: number;
  percentageOfTotal: number;
  awardCount: number;
}

@Component({
  selector: 'app-agency-spotlight',
  templateUrl: './agency-spotlight.component.html',
  standalone: true,
  imports: [CurrencyFormatPipe, BarChartComponent, FormsModule, MatSelectModule, MatFormFieldModule, MatOptionModule, MatTableModule],
})
export class AgencySpotlightComponent implements OnInit {
  readonly route = inject(ActivatedRoute);
  readonly apiService = inject(ApiService);

  agency: AgencySummary | null = null;
  loading = true;
  error = '';
  badgeColor = 'neutral';
  badgeText = '';
  fiscalYearStart = 2020;
  fiscalYearEnd = 2024;
  availableYears: number[] = [2020, 2021, 2022, 2023, 2024];
  chartData: ChartData = { labels: [], datasets: [] };
  insight = '';
  tableData: TableDataRow[] = [];
  displayedColumns = ['awardType', 'obligatedAmount', 'percentageOfTotal', 'awardCount'];

  private currentRecords: SpendingRecord[] = [];

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.loading = true;
        this.apiService.getAgencySummary(Number(id)).subscribe({
          next: (summary) => {
            if (summary) {
              this.agency = summary;
              this.updateBadge();
            }
            this.apiService.getAgencySpotlight(Number(id)).subscribe({
              next: (records) => {
                this.loading = false;
                this.currentRecords = records ?? [];
                if (this.currentRecords.length > 0) {
                  this.buildStackedChartFromRecords(this.currentRecords);
                  this.populateAvailableYears();
                }
                this.insight = this.computeInsight();
                this.tableData = this.buildTableData();
              },
              error: () => {
                this.error = 'Failed to load agency data';
                this.loading = false;
              },
            });
          },
          error: () => {
            this.loading = false;
            this.error = 'Failed to load agency summary';
          },
        });
      }
    });
  }

  onRangeChange(): void {
    this.buildStackedChartFromRecords(this.currentRecords);
    this.tableData = this.buildTableData();
  }

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

  private populateAvailableYears(): void {
    const years = new Set<number>();
    for (const record of this.currentRecords) {
      years.add(record.fiscalYear);
    }
    this.availableYears = Array.from(years).sort((a, b) => a - b);
  }

  private updateBadge(): void {
    if (!this.agency) return;

    const { priorFyTotal, yoyChange } = this.agency;
    if (priorFyTotal === 0) {
      this.badgeColor = 'neutral';
      this.badgeText = '0.0% YoY';
    } else if (yoyChange >= 0) {
      this.badgeColor = 'positive';
      this.badgeText = `+${(yoyChange * 100).toFixed(1)}% YoY`;
    } else {
      this.badgeColor = 'negative';
      this.badgeText = `${(yoyChange * 100).toFixed(1)}% YoY`;
    }
  }

  private aggregateAwardTypesForYear(records: SpendingRecord[], fiscalYear: number): {
    sumsByType: Map<string, number>;
    countsByType: Map<string, number>;
    total: number;
  } {
    const sumsByType = new Map<string, number>();
    const countsByType = new Map<string, number>();
    let total = 0;
    for (const r of records) {
      if (r.fiscalYear !== fiscalYear) continue;
      sumsByType.set(r.awardTypeLabel, (sumsByType.get(r.awardTypeLabel) ?? 0) + r.obligatedAmount);
      countsByType.set(r.awardTypeLabel, (countsByType.get(r.awardTypeLabel) ?? 0) + r.awardCount);
      total += r.obligatedAmount;
    }
    return { sumsByType, countsByType, total };
  }

  private computeInsight(): string {
    if (!this.agency) {
      return 'No data available for the selected fiscal year.';
    }

    const { sumsByType, total } = this.aggregateAwardTypesForYear(this.currentRecords, this.fiscalYearEnd);
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
    const agencyName = this.agency.agency?.name || '';
    return `In FY${this.fiscalYearEnd}, ${agencyName} spent ${pct}% on ${maxType}.`;
  }

  private buildTableData(): TableDataRow[] {
    const { sumsByType, countsByType, total } = this.aggregateAwardTypesForYear(this.currentRecords, this.fiscalYearEnd);

    return Array.from(sumsByType.entries())
      .map(([awardType, obligated]) => ({
        awardType,
        obligatedAmount: obligated,
        percentageOfTotal: total > 0 ? Math.round(obligated / total * 1000) / 10 : 0,
        awardCount: countsByType.get(awardType) ?? 0,
      }))
      .sort((a, b) => b.obligatedAmount - a.obligatedAmount);
  }
}