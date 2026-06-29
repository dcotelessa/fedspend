import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from './loading.service';

export const LoadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingSvc = inject(LoadingService);
  loadingSvc.increment();
  return next(req).pipe(
    finalize(() => loadingSvc.decrement()),
  );
};
