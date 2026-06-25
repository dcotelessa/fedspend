import { IsInt, IsOptional, IsEnum, Min, Max } from 'class-validator';

export enum ScopeEnum {
  state = 'state',
  county = 'county',
  congressional = 'congressional',
}

export class GeographyQueryDto {
  @IsInt()
  @Min(2020)
  @Max(2024)
  @IsOptional()
  fiscalYear?: number;

  @IsEnum(ScopeEnum)
  scope: ScopeEnum;
}