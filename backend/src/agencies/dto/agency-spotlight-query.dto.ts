import { IsInt, IsOptional, IsEnum, Min, Max } from 'class-validator';
import { ScopeEnum } from '../../common/pagination.dto';

export class AgencySpotlightQueryDto {
  @IsInt()
  @Min(2020)
  @Max(2024)
  @IsOptional()
  fiscalYear?: number;

  @IsEnum(ScopeEnum)
  scope: ScopeEnum;
}