import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService, AgencyWithTotal } from '../api.service';
import { CurrencyFormatPipe } from '../currency-format.pipe';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

@Component({
  selector: 'app-agency-list',
  imports: [CommonModule, RouterModule, CurrencyFormatPipe],
  templateUrl: './agency-list.component.html',
  styleUrl: './agency-list.component.scss',
})
export class AgencyListComponent {
  private readonly api = inject(ApiService);
  readonly agencies = toSignal(
    this.api.getAgencies().pipe(map(a => a.filter(x => x.totalCents > 0))),
    { initialValue: [] as AgencyWithTotal[] },
  );
}
