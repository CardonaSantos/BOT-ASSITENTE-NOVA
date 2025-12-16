import { Module } from '@nestjs/common';
import { WhatsAppMessageService } from './app/whatsapp-chat.service';
import { ChatController } from './presentation/chat.controller';
import { PrismaService } from 'src/prisma/prisma-service/prisma-service.service';
import { WHATSAPP_MESSAGE } from './domain/whatsapp-chat.repository';
import { PrismaWhatsappMessage } from './infraestructure/prisma-whatsapp-chat';
import { MetaWhatsAppMediaService } from './app/meta-media.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    HttpModule, // ✅ ESTO
  ],

  controllers: [ChatController],
  providers: [
    WhatsAppMessageService,
    MetaWhatsAppMediaService,
    PrismaService,
    {
      provide: WHATSAPP_MESSAGE,
      useClass: PrismaWhatsappMessage,
    },
  ],
  exports: [WhatsAppMessageService, MetaWhatsAppMediaService],
})
export class WhatsappMessageModule {}
