import { IsInt, IsOptional, IsEnum, Min, Max } from 'class-validator';

export enum DefGroupEnum {
  wildfire = 'wildfire',
  flood = 'flood',
  hurricane = 'hurricane',
  earthquake = 'earthquake',
  tornado = 'tornado',
  drought = 'drought',
  other = 'other',
}

export class DisasterStatesQueryDto {
  @IsInt()
  @Min(2020)
  @Max(2024)
  @IsOptional()
  fiscalYear?: number;

  @IsEnum(DefGroupEnum)
  defGroup: DefGroupEnum;
}