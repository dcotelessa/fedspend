import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatOptionModule } from '@angular/material/core';
import { Agency } from '@shared/interfaces';
import { GeographyQuery } from '@shared/interfaces';

@Component({
  selector: 'app-geographic-view',
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatSelectModule, MatButtonToggleModule, MatOptionModule],
  templateUrl: './geographic-view.component.html',
})
export class GeographicViewComponent {
  agencyId = signal<number | null>(null);
  fiscalYear = signal<number>(2020);
  scope = signal<'recipient' | 'performance'>('recipient');

  get agencyIdValue(): number | null {
    return this.agencyId();
  }

  get fiscalYearValue(): number {
    return this.fiscalYear();
  }

  get scopeValue(): 'recipient' | 'performance' {
    return this.scope();
  }

  get agencyList(): Agency[] {
    return this.agencyId() === null
      ? [{ id: 1, name: 'Department of Agriculture', abbreviation: 'USDA', toptierCode: '01' },
         { id: 2, name: 'Department of Defense', abbreviation: 'DOD', toptierCode: '02' },
         { id: 3, name: 'Department of Education', abbreviation: 'ED', toptierCode: '03' },
         { id: 4, name: 'Department of Health and Human Services', abbreviation: 'HHS', toptierCode: '04' },
         { id: 5, name: 'Department of Homeland Security', abbreviation: 'DHS', toptierCode: '05' },
         { id: 6, name: 'Department of State', abbreviation: 'STATE', toptierCode: '06' },
         { id: 7, name: 'Department of Transportation', abbreviation: 'DOT', toptierCode: '07' }]
      : [];
  }

  get fiscalYearList(): number[] {
    return [2020, 2021, 2022, 2023, 2024];
  }

  filter$ = computed<GeographyQuery>(() => ({
    agencyId: this.agencyId(),
    fiscalYear: this.fiscalYear(),
    scope: this.scope(),
  }));
}
