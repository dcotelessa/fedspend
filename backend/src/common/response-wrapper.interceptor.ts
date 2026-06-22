import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { ApiResponse } from '@shared/interfaces';

@Injectable()
export class ResponseWrapperInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const isPaginated = this.reflector.getAllAndOverride<boolean>('isPaginated', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!isPaginated) {
      return next.handle();
    }

    return next.handle().pipe(
      map((response) => {
        // If response is an array, wrap it in ApiResponse
        // If response is a single item, pass it through
        if (Array.isArray(response)) {
          // In a real implementation, this would use actual pagination data
          // For now, we'll use a basic structure
          return {
            data: response,
            meta: {
              total: response.length,
              page: 1,
              pageSize: response.length,
            },
          } as ApiResponse<any[]>;
        }
        // If it's not an array, pass through as-is
        return response;
      }),
    );
  }
}