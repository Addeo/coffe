import { IsNotEmpty, IsString, IsNumber, IsOptional, IsBoolean, Min } from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  baseRate: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  overtimeMultiplier?: number;

  @IsOptional()
  @IsBoolean()
  hasOvertime?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
