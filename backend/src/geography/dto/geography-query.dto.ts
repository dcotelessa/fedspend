import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ScopeEnum } from '../../common/pagination.dto';

export class GeographyQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2024)
  fiscalYear?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  agencyId?: number;

  @IsEnum(ScopeEnum)
  scope: ScopeEnum;
}
