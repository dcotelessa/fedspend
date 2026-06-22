import { ResponseWrapperInterceptor } from './response-wrapper.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { ApiResponse } from '@shared/interfaces';

describe('ResponseWrapperInterceptor', () => {
  let interceptor: ResponseWrapperInterceptor;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as Reflector;
    interceptor = new ResponseWrapperInterceptor(reflector);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should pass through non-array response when paginated decorator is present', async () => {
    const response = { id: 1 };
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;

    const next = {
      handle: jest.fn().mockReturnValue(of(response)),
    } as unknown as CallHandler;

    reflector.getAllAndOverride.mockReturnValue(true);

    const result = await interceptor.intercept(context, next).toPromise();
    expect(result).toEqual(response);
  });

  it('should wrap array response when paginated decorator is present', async () => {
    const response = [{ id: 1 }, { id: 2 }];
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;

    const next = {
      handle: jest.fn().mockReturnValue(of(response)),
    } as unknown as CallHandler;

    reflector.getAllAndOverride.mockReturnValue(true);

    const result = await interceptor.intercept(context, next).toPromise();
    expect(result).toEqual({
      data: response,
      meta: {
        total: 2,
        page: 1,
        pageSize: 2,
      }
    });
  });

  it('should pass through response when paginated decorator is not present', async () => {
    const response = [{ id: 1 }, { id: 2 }];
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;

    const next = {
      handle: jest.fn().mockReturnValue(of(response)),
    } as unknown as CallHandler;

    reflector.getAllAndOverride.mockReturnValue(false);

    const result = await interceptor.intercept(context, next).toPromise();
    expect(result).toEqual(response);
  });
});