import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';
import { UserRole } from '../../../entities/user.entity';
import { EngineerType } from '../../../shared/interfaces/order.interface';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  firstName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  lastName?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  // Engineer-specific fields
  @IsOptional()
  @IsEnum(EngineerType)
  engineerType?: EngineerType;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  baseRate?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  overtimeRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  planHoursMonth?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  homeTerritoryFixedAmount?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  fixedSalary?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  fixedCarAmount?: number;

  @IsOptional()
  engineerIsActive?: boolean;

  @IsOptional()
  isActive?: boolean;
}
