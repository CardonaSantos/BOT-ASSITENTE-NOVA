// agent-chat.controller.ts
import {
  Body,
  Controller,
  Post,
  NotFoundException,
  Logger,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';

import {
  ChatRole,
  WazDirection,
  WazMediaType,
  WazStatus,
} from '@prisma/client';
import * as crypto from 'crypto';
import { ChatService } from 'src/chat/app/chat.service';
import { ClienteService } from 'src/cliente/app/cliente.service';
import { PrismaService } from 'src/prisma/prisma-service/prisma-service.service';
import { WhatsappApiMetaService } from 'src/whatsapp-api-meta/app/whatsapp-api-meta.service';
import { WhatsAppMessageService } from 'src/whatsapp/chat/app/whatsapp-chat.service';
import { SendHumanTextService } from '../app/send-human-text.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('agent/chat')
export class AgentChatController {
  private readonly logger = new Logger(AgentChatController.name);
  constructor(
    // private readonly whatsappApi: WhatsappApiMetaService,
    // private readonly whatsappMessage: WhatsAppMessageService,
    // private readonly clienteService: ClienteService,
    // private readonly chatService: ChatService,
    private readonly prisma: PrismaService,
    private readonly humanResponse: SendHumanTextService,
  ) {}

  @Post('send')
  @UseInterceptors(FileInterceptor('file')) // 👈 Habilita recibir archivos
  async sendMessage(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { clienteId: string; text: string }, // Llegan como string por FormData
  ) {
    const clienteId = Number(body.clienteId); // Convertir string a numero
    const text = body.text || '';

    await this.humanResponse.sendHumanResponse(clienteId, text, file);
    return { ok: true };
  }

  @Post('toggle-bot')
  async toggleBot(@Body() body: { clienteId: number; active: boolean }) {
    await this.prisma.cliente.update({
      where: { id: body.clienteId },
      data: { botActivo: body.active },
    });
    return { ok: true };
  }
}
