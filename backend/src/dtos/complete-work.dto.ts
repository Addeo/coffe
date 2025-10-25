import { IsNotEmpty, IsNumber, IsOptional, IsString, IsBoolean, Min } from 'class-validator';
import { TerritoryType } from '../shared/interfaces/order.interface';

export class CompleteWorkDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  regularHours: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  overtimeHours?: number;

  @IsOptional()
  @IsString()
  territoryType?: TerritoryType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  distanceKm?: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  carPayment: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsNotEmpty()
  @IsBoolean()
  isFullyCompleted: boolean;
}
