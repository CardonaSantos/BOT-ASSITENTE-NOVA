import {
  IsOptional,
  IsString,
  IsInt,
  IsEnum,
  IsDate,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WazDirection, WazMediaType, WazStatus } from '@prisma/client';

export class SearchWhatsappMessageDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  clienteId?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  chatSessionId?: number;

  @IsOptional()
  @IsEnum(WazDirection)
  direction?: WazDirection;

  @IsOptional()
  @IsEnum(WazStatus)
  status?: WazStatus;

  @IsOptional()
  @IsEnum(WazMediaType)
  type?: WazMediaType;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  //  Rango de Fechas (Hasta)
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  // Paginación: Página actual
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  //  Paginación
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;
}
