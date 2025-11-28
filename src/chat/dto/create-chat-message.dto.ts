// src/chat/dto/create-chat-message.dto.ts
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { ChatRole } from '@prisma/client';

export class CreateChatMessageDto {
  @IsInt()
  sessionId: number;

  @IsEnum(ChatRole)
  rol: ChatRole;

  @IsString()
  contenido: string;

  @IsOptional()
  @IsInt()
  tokens?: number;
}
