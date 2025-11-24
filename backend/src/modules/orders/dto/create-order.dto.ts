import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsArray,
  IsUUID,
  Min,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TerritoryType, OrderSource } from '../../../shared/interfaces/order.interface';

export class CreateOrderDto {
  @IsNumber()
  @IsNotEmpty()
  organizationId: number;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  location: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  distanceKm?: number;

  @IsOptional()
  @IsEnum(TerritoryType)
  territoryType?: TerritoryType;

  @IsOptional()
  @IsEnum(OrderSource)
  source?: OrderSource;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  plannedStartDate?: Date;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  files?: string[];
}
