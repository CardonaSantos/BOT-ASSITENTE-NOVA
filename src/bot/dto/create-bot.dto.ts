import {
  IsString,
  IsOptional,
  IsInt,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator';
import { BotStatus } from '@prisma/client';

export class CreateBotDto {
  @IsInt()
  empresaId: number;

  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsString()
  @IsOptional()
  descripcion?: string | null;

  // LLM provider y modelo
  @IsString()
  @IsOptional()
  provider?: string = 'fireworks';

  @IsString()
  @IsOptional()
  model?: string = 'accounts/fireworks/models/gpt-oss-120b';

  // Prompts
  @IsString()
  @IsNotEmpty()
  systemPrompt: string;

  @IsString()
  @IsOptional()
  contextPrompt?: string | null;

  @IsString()
  @IsOptional()
  historyPrompt?: string | null;

  @IsString()
  @IsOptional()
  outputStyle?: string | null;

  // Parámetros del modelo
  @IsInt()
  @Min(1)
  @IsOptional()
  maxCompletionTokens: number = 500;

  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  temperature: number = 0.7;

  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  topP: number = 0.9;

  @IsNumber()
  @IsOptional()
  frequencyPenalty: number = 0.2;

  @IsNumber()
  @IsOptional()
  presencePenalty: number = 0.0;

  @IsInt()
  @Min(1)
  @IsOptional()
  maxHistoryMessages: number = 15;

  @IsEnum(BotStatus)
  @IsOptional()
  status: BotStatus = BotStatus.ACTIVE;
}
