import { IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class DisasterQueryDto {
  @IsOptional()
  @IsString()
  defGroup?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  fiscalYear?: number;
}
