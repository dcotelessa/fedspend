import { IsInt, IsOptional, Min, Max } from 'class-validator';

export enum ScopeEnum {
  state = 'state',
  county = 'county',
  congressional = 'congressional',
}

export class PaginationDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  pageSize?: number;
}