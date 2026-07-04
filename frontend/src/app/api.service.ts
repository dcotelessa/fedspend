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
  totalObligated: number;
  totalAwardCount: number;
  ratios: Array<{
    recoveryRatio: number;
    femaObligated: number;
    fedSpendingObligated: number;
    declarationCount: number;
  }>;
  declarationCount: number;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  private toParams(params: object): HttpParams {
    return Object.entries(params).reduce<HttpParams>(
      (acc, [key, value]) => (value === undefined ? acc : acc.set(key, String(value))),
      new HttpParams(),
    );
  }

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
    return this.http.get<GeoSpendingSnapshot[]>(
      `${environment.apiUrl}/geography/states`,
      { params: this.toParams(params) },
    ).pipe(
      catchError(() => of([] as GeoSpendingSnapshot[])),
    );
  }

  getGeographyState(code: string): Observable<GeoSpendingSnapshot[]> {
    return this.http.get<GeoSpendingSnapshot[]>(`${environment.apiUrl}/geography/state/${code}`).pipe(
      catchError(() => of([] as GeoSpendingSnapshot[])),
    );
  }

  getDisasterOverview(params: { defGroup?: string } = {}): Observable<DisasterOverview[]> {
    return this.http.get<DisasterOverview[]>(
      `${environment.apiUrl}/disaster/overview`,
      { params: this.toParams(params) },
    ).pipe(
      catchError(() => of([] as DisasterOverview[])),
    );
  }

  getDisasterStates(params: { defGroup?: string; fiscalYear?: number }): Observable<DisasterFundingRecord[]> {
    return this.http.get<DisasterFundingRecord[]>(
      `${environment.apiUrl}/disaster/states`,
      { params: this.toParams(params) },
    ).pipe(
      catchError(() => of([] as DisasterFundingRecord[])),
    );
  }

  getDisasterRecoveryRatios(params: { fiscalYear?: number }): Observable<DisasterRecoveryRatio[]> {
    return this.http.get<DisasterRecoveryRatio[]>(
      `${environment.apiUrl}/disaster/recovery-ratios`,
      { params: this.toParams(params) },
    ).pipe(
      catchError(() => of([] as DisasterRecoveryRatio[])),
    );
  }

  getDisasterState(code: string): Observable<DisasterStateProfile | null> {
    return this.http.get<DisasterStateProfile>(`${environment.apiUrl}/disaster/state/${code}`).pipe(
      catchError(() => of(null)),
    );
  }

  getLastSync(): Observable<string | null> {
    return this.http.get<Record<string, { lastSyncAt: string }>>(`${environment.apiUrl}/sync/status`).pipe(
      map(statuses => {
        const entries = Object.values(statuses);
        if (entries.length === 0) return null;
        return entries
          .map(e => e.lastSyncAt)
          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
      }),
      catchError(() => of(null)),
    );
  }
}
