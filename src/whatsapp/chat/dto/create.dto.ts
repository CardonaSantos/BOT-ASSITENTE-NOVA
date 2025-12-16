import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { WazDirection, WazMediaType, WazStatus } from '@prisma/client';

export class CreateWhatsappMessageDto {
  @IsString()
  wamid: string;

  @IsOptional()
  //   @Type(() => Number)
  @IsInt()
  chatSessionId?: number | null;

  @IsOptional()
  //   @Type(() => Number)
  @IsInt()
  clienteId?: number | null;

  @IsEnum(WazDirection)
  direction: WazDirection;

  @IsString()
  from: string;

  @IsString()
  to: string;

  @IsEnum(WazMediaType)
  type: WazMediaType;

  @IsOptional()
  @IsString()
  body?: string | null;

  @IsOptional()
  @IsString()
  mediaUrl?: string | null;

  @IsOptional()
  @IsString()
  mediaMimeType?: string | null;

  @IsOptional()
  @IsString()
  mediaSha256?: string | null;

  @IsOptional()
  @IsEnum(WazStatus)
  status?: WazStatus;

  @IsOptional()
  @IsString()
  replyToWamid?: string | null;

  // Meta manda timestamp como string/number (segundos unix)
  @IsString()
  timestamp: string; // lo convertimos a BigInt adentro
}
