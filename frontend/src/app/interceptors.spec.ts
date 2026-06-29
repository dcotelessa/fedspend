import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import {
  HttpInterceptorFn,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { LoadingInterceptor } from './loading.interceptor';
import { ErrorInterceptor } from './error.interceptor';
import { LoadingService } from './loading.service';

const loadingInterceptorFn: HttpInterceptorFn = LoadingInterceptor;

describe('LoadingInterceptor', () => {
  let httpMock: HttpTestingController;
  let loadingService: LoadingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([loadingInterceptorFn])),
        provideHttpClientTesting(),
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    loadingService = TestBed.inject(LoadingService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('sets loading$ to true during a request and false after response', fakeAsync(() => {
    expect(loadingService.loading$()).toBe(false);

    TestBed.inject(HttpClient).get('/api/test').subscribe();
    tick();

    expect(loadingService.loading$()).toBe(true);

    const req = httpMock.expectOne('/api/test');
    req.flush({});

    tick();

    expect(loadingService.loading$()).toBe(false);
  }));

  it('increments counter and decrements after error response', fakeAsync(() => {
    expect(loadingService.loading$()).toBe(false);

    TestBed.inject(HttpClient).get('/api/test').subscribe({
      error: () => {},
    });
    tick();

    expect(loadingService.loading$()).toBe(true);

    const req = httpMock.expectOne('/api/test');
    req.flush('Error', { status: 500, statusText: 'Internal Server Error' });

    tick();

    expect(loadingService.loading$()).toBe(false);
  }));
});

const errorInterceptorFn: HttpInterceptorFn = ErrorInterceptor;

describe('ErrorInterceptor', () => {
  let httpMock: HttpTestingController;
  let snackBarSpy: jest.SpyInstance;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptorFn])),
        provideHttpClientTesting(),
        { provide: MatSnackBar, useClass: MatSnackBar },
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    snackBarSpy = jest.spyOn(MatSnackBar.prototype, 'open');
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('shows snack-bar on non-2xx error', fakeAsync(() => {
    TestBed.inject(HttpClient).get('/api/test').subscribe({
      error: (err) => {
        expect(err.status).toBe(404);
      },
    });
    tick();

    const req = httpMock.expectOne('/api/test');
    req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    tick();

    expect(snackBarSpy).toHaveBeenCalled();
    expect(snackBarSpy.mock.calls[0][0]).toContain('404');
  }));

  it('re-throws the error so subscribers receive it', fakeAsync(() => {
    let errorReceived = false;

    TestBed.inject(HttpClient).get('/api/test').subscribe({
      error: () => {
        errorReceived = true;
      },
    });
    tick();

    const req = httpMock.expectOne('/api/test');
    req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
    tick();

    expect(errorReceived).toBe(true);
  }));
});
