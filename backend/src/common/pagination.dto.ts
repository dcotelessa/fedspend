import { IsInt, IsOptional, Min, Max } from 'class-validator';

export class PaginationDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @IsInt()
  @Max(100)
  @IsOptional()
  pageSize?: number;
}