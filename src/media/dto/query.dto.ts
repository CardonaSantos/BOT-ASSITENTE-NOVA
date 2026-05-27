import { WazDirection, WazMediaType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export class QueryMediaSearch {
  @IsOptional()
  @IsString()
  creadoEn?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  clienteId?: number;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsEnum(WazMediaType)
  type?: WazMediaType;

  @IsOptional()
  @IsEnum(WazDirection)
  direction?: WazDirection;
}
