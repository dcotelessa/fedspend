import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { provideHttpClient } from '@angular/common/http';

import { GeographicViewComponent } from './geographic-view.component';
import { GeographyQuery } from '@shared/interfaces';

describe('GeographicViewComponent', () => {
  let component: GeographicViewComponent;
  let fixture: ComponentFixture<GeographicViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        GeographicViewComponent,
        MatSelectModule,
        MatButtonToggleModule,
      ],
      providers: [provideHttpClient()],
    }).compileComponents();

    fixture = TestBed.createComponent(GeographicViewComponent);
    component = fixture.componentInstance;
  });

  interface TestCase {
    name: string;
    setAgencyId: number | null;
    setFiscalYear: number;
    setScope: 'recipient' | 'performance';
    expected: GeographyQuery;
  }

  const testTable: TestCase[] = [
    {
      name: 'initial filter has defaults (null agency, 2020, recipient)',
      setAgencyId: null,
      setFiscalYear: 2020,
      setScope: 'recipient',
      expected: { agencyId: null, fiscalYear: 2020, scope: 'recipient' },
    },
    {
      name: 'setting agencyId updates filter',
      setAgencyId: 42,
      setFiscalYear: 2022,
      setScope: 'performance',
      expected: { agencyId: 42, fiscalYear: 2022, scope: 'performance' },
    },
    {
      name: 'setting fiscalYear updates filter',
      setAgencyId: null,
      setFiscalYear: 2024,
      setScope: 'recipient',
      expected: { agencyId: null, fiscalYear: 2024, scope: 'recipient' },
    },
    {
      name: 'setting scope to performance updates filter',
      setAgencyId: 7,
      setFiscalYear: 2021,
      setScope: 'performance',
      expected: { agencyId: 7, fiscalYear: 2021, scope: 'performance' },
    },
    {
      name: 'setting scope to recipient updates filter',
      setAgencyId: null,
      setFiscalYear: 2020,
      setScope: 'recipient',
      expected: { agencyId: null, fiscalYear: 2020, scope: 'recipient' },
    },
    {
      name: 'setting agencyId to null updates filter',
      setAgencyId: null,
      setFiscalYear: 2023,
      setScope: 'performance',
      expected: { agencyId: null, fiscalYear: 2023, scope: 'performance' },
    },
    {
      name: 'full filter change emits correct GeographyQuery',
      setAgencyId: 15,
      setFiscalYear: 2024,
      setScope: 'recipient',
      expected: { agencyId: 15, fiscalYear: 2024, scope: 'recipient' },
    },
  ];

  it.each(testTable)('$name', ({ setAgencyId, setFiscalYear, setScope, expected }) => {
    component.agencyId.set(setAgencyId);
    component.fiscalYear.set(setFiscalYear);
    component.scope.set(setScope);

    expect(component.filter$()).toEqual(expected);
  });
});
