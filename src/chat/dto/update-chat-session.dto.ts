// src/chat/dto/update-chat-session.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateChatSessionDto } from './create-chat-session.dto';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ChatSessionStatus } from '@prisma/client';

export class UpdateChatSessionDto extends PartialType(CreateChatSessionDto) {
  @IsOptional()
  @IsEnum(ChatSessionStatus)
  estado?: ChatSessionStatus;

  @IsOptional()
  @IsString()
  ultimoTicketCrmId?: string;
}
