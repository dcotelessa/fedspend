import { IsInt, IsOptional, Min, Max } from 'class-validator';

export class DisasterRatiosQueryDto {
  @IsInt()
  @Min(2020)
  @Max(2024)
  @IsOptional()
  fiscalYear?: number;
}