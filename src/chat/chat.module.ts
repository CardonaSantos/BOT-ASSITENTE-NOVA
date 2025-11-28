// src/chat/chat.module.ts
import { Module } from '@nestjs/common';
import { ChatService } from './app/chat.service';
import { CHAT_SESSION_REPOSITORY } from './domain/chat-session.repository';
import { CHAT_MESSAGE_REPOSITORY } from './domain/chat-message.repository';
import { ChatController } from './presentation/chat.controller';
import { PrismaModuleModule } from 'src/prisma/prisma-module/prisma-module.module';
import { PrismaChatSessionRepository } from './infraestructure/prisma-chat-session.repository';
import { PrismaChatMessageRepository } from './infraestructure/prisma-chat-message.repository';

@Module({
  imports: [PrismaModuleModule],
  controllers: [ChatController],
  providers: [
    ChatService,
    {
      provide: CHAT_SESSION_REPOSITORY,
      useClass: PrismaChatSessionRepository,
    },
    {
      provide: CHAT_MESSAGE_REPOSITORY,
      useClass: PrismaChatMessageRepository,
    },
  ],
  exports: [ChatService],
})
export class ChatModule {}
