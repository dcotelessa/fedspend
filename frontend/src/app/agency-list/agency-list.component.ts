import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { ApiService, AgencyWithTotal } from '../api.service';
import { CurrencyFormatPipe } from '../currency-format.pipe';

@Component({
  selector: 'app-agency-list',
  imports: [CommonModule, RouterModule, MatCardModule, MatListModule, CurrencyFormatPipe],
  templateUrl: './agency-list.component.html',
})
export class AgencyListComponent implements OnInit {
  private readonly api = inject(ApiService);
  agencies: AgencyWithTotal[] = [];

  ngOnInit(): void {
    this.api.getAgencies().subscribe(a => (this.agencies = a));
  }
}
