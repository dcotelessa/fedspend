import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';

export const ErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const msg = error.status
        ? `${error.status}: ${error.message}`
        : 'Network error';
      snackBar.open(msg, 'Dismiss', { duration: 5000 });
      return throwError(() => error);
    }),
  );
};
