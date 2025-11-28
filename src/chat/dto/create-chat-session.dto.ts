// src/chat/dto/create-chat-session.dto.ts
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { ChatChannel } from '@prisma/client';

export class CreateChatSessionDto {
  @IsInt()
  empresaId: number;

  @IsOptional()
  @IsInt()
  clienteId?: number;

  @IsString()
  telefono: string;

  @IsEnum(ChatChannel)
  canal: ChatChannel;
}
