import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { WazDirection, WazMediaType, WazStatus } from '@prisma/client';

export class FindWhatsappMessagesQueryDto {
  @IsOptional()
  @IsString()
  telefono?: string; // filtra por "from" o "to" según quieras

  @IsOptional()
  //   @Type(() => Number)
  @IsInt()
  clienteId?: number;

  @IsOptional()
  //   @Type(() => Number)
  @IsInt()
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
  //   @Type(() => Number)
  @IsInt()
  take?: number; // paginación simple

  @IsOptional()
  //   @Type(() => Number)
  @IsInt()
  skip?: number;
}
