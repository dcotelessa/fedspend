import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../api.service';
import { CurrencyFormatPipe } from '../currency-format.pipe';
import { AgencySummary } from '@shared/interfaces';

@Component({
  selector: 'app-agency-spotlight',
  templateUrl: './agency-spotlight.component.html',
  standalone: true,
  imports: [CurrencyFormatPipe],
})
export class AgencySpotlightComponent implements OnInit {
  readonly routeParam = inject(ActivatedRoute);
  readonly apiService = inject(ApiService);

  agency: AgencySummary | null = null;
  loading = true;
  error = '';
  badgeColor = 'Neutral';
  badgeText = '';

  ngOnInit() {
    this.routeParam.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.apiService.getAgencySummary(Number(id)).subscribe({
          next: (summary) => {
            this.agency = summary || null;
            this.loading = false;
            if (this.agency) {
              this.badgeColor = this.computeBadgeColor(this.agency.yoyChange);
              this.badgeText = this.computeBadgeText(this.agency.yoyChange);
            } else {
              this.badgeColor = '';
              this.badgeText = '';
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

  private computeBadgeColor(yoyChange: number): string {
    if (yoyChange > 0) return 'Green';
    if (yoyChange < 0) return 'Red';
    return 'Neutral';
  }

  private computeBadgeText(yoyChange: number): string {
    if (yoyChange > 0) return `+${(yoyChange * 100).toFixed(1)}%`;
    if (yoyChange < 0) return `${(yoyChange * 100).toFixed(1)}%`;
    return '0%';
  }
}
