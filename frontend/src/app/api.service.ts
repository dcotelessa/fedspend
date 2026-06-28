import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../environments/environment';
import {
  AgencySummary,
  DisasterFundingRecord,
  DisasterOverview,
  DisasterRecoveryRatio,
  GeoSpendingSnapshot,
  SpendingRecord,
} from '@shared/interfaces';

export interface AgencyWithTotal {
  id: number;
  name: string;
  totalCents: number;
}

export interface DisasterStateProfile {
  stateCode: string;
  stateName: string;
  [key: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  getAgencies(): Observable<AgencyWithTotal[]> {
    return this.http.get<{ data: AgencyWithTotal[] }>(`${environment.apiUrl}/agencies`).pipe(
      map(r => r.data),
      catchError(() => of([] as AgencyWithTotal[])),
    );
  }

  getAgencySpotlight(id: number): Observable<SpendingRecord[] | null> {
    return this.http.get<SpendingRecord[]>(`${environment.apiUrl}/agencies/${id}/spotlight`).pipe(
      catchError(() => of(null)),
    );
  }

  getAgencySummary(id: number): Observable<AgencySummary | null> {
    return this.http.get<AgencySummary>(`${environment.apiUrl}/agencies/${id}/summary`).pipe(
      catchError(() => of(null)),
    );
  }

  getGeographyStates(params: { fiscalYear?: number; agencyId?: number; scope?: string }): Observable<GeoSpendingSnapshot[]> {
    let httpParams = new HttpParams();
    if (params.fiscalYear !== undefined) {
      httpParams = httpParams.set('fiscalYear', String(params.fiscalYear));
    }
    if (params.agencyId !== undefined) {
      httpParams = httpParams.set('agencyId', String(params.agencyId));
    }
    if (params.scope !== undefined) {
      httpParams = httpParams.set('scope', params.scope);
    }
    return this.http.get<GeoSpendingSnapshot[]>(`${environment.apiUrl}/geography/states`, { params: httpParams }).pipe(
      catchError(() => of([] as GeoSpendingSnapshot[])),
    );
  }

  getGeographyState(code: string): Observable<GeoSpendingSnapshot[]> {
    return this.http.get<GeoSpendingSnapshot[]>(`${environment.apiUrl}/geography/state/${code}`).pipe(
      catchError(() => of([] as GeoSpendingSnapshot[])),
    );
  }

  getDisasterOverview(): Observable<DisasterOverview[]> {
    return this.http.get<DisasterOverview[]>(`${environment.apiUrl}/disaster/overview`).pipe(
      catchError(() => of([] as DisasterOverview[])),
    );
  }

  getDisasterStates(params: { defGroup?: string; fiscalYear?: number }): Observable<DisasterFundingRecord[]> {
    let httpParams = new HttpParams();
    if (params.defGroup !== undefined) {
      httpParams = httpParams.set('defGroup', params.defGroup);
    }
    if (params.fiscalYear !== undefined) {
      httpParams = httpParams.set('fiscalYear', String(params.fiscalYear));
    }
    return this.http.get<DisasterFundingRecord[]>(`${environment.apiUrl}/disaster/states`, { params: httpParams }).pipe(
      catchError(() => of([] as DisasterFundingRecord[])),
    );
  }

  getDisasterRecoveryRatios(params: { fiscalYear?: number }): Observable<DisasterRecoveryRatio[]> {
    let httpParams = new HttpParams();
    if (params.fiscalYear !== undefined) {
      httpParams = httpParams.set('fiscalYear', String(params.fiscalYear));
    }
    return this.http.get<DisasterRecoveryRatio[]>(`${environment.apiUrl}/disaster/recovery-ratios`, { params: httpParams }).pipe(
      catchError(() => of([] as DisasterRecoveryRatio[])),
    );
  }

  getDisasterState(code: string): Observable<DisasterStateProfile | null> {
    return this.http.get<DisasterStateProfile>(`${environment.apiUrl}/disaster/state/${code}`).pipe(
      catchError(() => of(null)),
    );
  }
}
