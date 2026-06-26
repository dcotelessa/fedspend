import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { GeographicViewComponent } from './geographic-view/geographic-view.component';
import { AgencyListComponent } from './agency-list/agency-list.component';
import { AgencySpotlightComponent } from './agency-spotlight/agency-spotlight.component';
import { DisasterLensComponent } from './disaster-lens/disaster-lens.component';

export const routes: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'geography', component: GeographicViewComponent },
  { path: 'agencies', component: AgencyListComponent },
  { path: 'agencies/:id', component: AgencySpotlightComponent },
  { path: 'disaster', component: DisasterLensComponent }
];
