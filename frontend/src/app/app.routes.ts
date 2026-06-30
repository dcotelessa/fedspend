import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent) },
  { path: 'geography', loadComponent: () => import('./geographic-view/geographic-view.component').then(m => m.GeographicViewComponent) },
  { path: 'agencies', loadComponent: () => import('./agency-list/agency-list.component').then(m => m.AgencyListComponent) },
  { path: 'agencies/:id', loadComponent: () => import('./agency-spotlight/agency-spotlight.component').then(m => m.AgencySpotlightComponent) },
  { path: 'disaster', loadComponent: () => import('./disaster-lens/disaster-lens.component').then(m => m.DisasterLensComponent) },
];
