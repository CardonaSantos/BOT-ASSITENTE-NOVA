// src/chat/presentation/chat.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ChatService } from '../app/chat.service';
import { CreateChatSessionDto } from '../dto/create-chat-session.dto';
import { UpdateChatSessionDto } from '../dto/update-chat-session.dto';
import { CreateChatMessageDto } from '../dto/create-chat-message.dto';
import { ChatRole } from '@prisma/client';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // Crear sesión manual (debug)
  @Post('sessions')
  createSession(@Body() dto: CreateChatSessionDto) {
    return this.chatService.createSession({
      empresaId: dto.empresaId,
      clienteId: dto.clienteId,
      telefono: dto.telefono,
      canal: dto.canal,
    });
  }

  // Obtener o crear sesión abierta (por ejemplo, para pruebas)
  @Post('sessions/ensure')
  ensureOpenSession(@Body() dto: CreateChatSessionDto) {
    return this.chatService.ensureOpenSession({
      empresaId: dto.empresaId,
      clienteId: dto.clienteId,
      telefono: dto.telefono,
      canal: dto.canal,
    });
  }

  // Marcar todo chat como visto
  @Patch('/:id/mark-as-read')
  markChatAsRead(@Param('id', ParseIntPipe) id: number) {
    return this.chatService.markChatAsRead(id);
  }

  @Patch('/:id/mark-as-read')
  removeAllClienteMessagesAndSession(@Param('id', ParseIntPipe) id: number) {
    return this.chatService.markChatAsRead(id);
  }

  // Cerrar sesión
  @Patch('sessions/:id/close')
  closeSession(@Param('id') id: string) {
    return this.chatService.closeSession(+id);
  }

  // Adjuntar ticket de CRM a la sesión
  @Patch('sessions/:id/ticket')
  attachTicket(@Param('id') id: string, @Body('ticketId') ticketId: string) {
    return this.chatService.attachTicketToSession(+id, ticketId);
  }

  // Crear mensaje en una sesión
  @Post('messages')
  addMessage(@Body() dto: CreateChatMessageDto) {
    return this.chatService.addMessage({
      sessionId: dto.sessionId,
      rol: dto.rol as ChatRole,
      contenido: dto.contenido,
      tokens: dto.tokens,
    });
  }

  // Listar mensajes de una sesión
  @Get('sessions/:id/messages')
  getMessages(@Param('id') id: string, @Query('limit') limit?: string) {
    const parsedLimit = limit ? Number(limit) : undefined;
    if (parsedLimit) {
      return this.chatService.getLastMessages(+id);
    }
    return this.chatService.getMessages(+id);
  }

  @Delete('remove-chat/:id')
  removeChatsSessions(@Param('id', ParseIntPipe) id: number) {
    return this.chatService.getMessages(id);
  }
}
