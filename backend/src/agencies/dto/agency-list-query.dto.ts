import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AgencyListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2024)
  fiscalYear?: number;
}
