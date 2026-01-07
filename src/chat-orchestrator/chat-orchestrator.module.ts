import { Module } from '@nestjs/common';
import { ChatOrchestratorController } from './presentation/chat-orchestrator.controller';
import { ChatOrchestratorService } from './app/chat-orchestrator.service';
import { EmpresaModule } from 'src/empresa/empresa.module';
import { ClienteModule } from 'src/cliente/cliente.module';
import { ChatModule } from 'src/chat/chat.module';
import { KnowledgeModule } from 'src/knowledge/knowledge.module';
import { FireworksIaModule } from 'src/fireworks-ia/fireworks-ia.module';
import { WhatsappMessageModule } from 'src/whatsapp/chat/chat.module';
import { CloudStorageDoSpacesModule } from 'src/cloud-storage-dospaces/cloud-storage-dospaces.module';
import { WhatsappApiClientModule } from 'src/whatsapp-api-meta/whatsapp-api-client.module';
import { BroadCastMessageService } from './app/broadcast-message.service';
import { AgentChatController } from './presentation/agent-chat.controller';
import { PrismaModuleModule } from 'src/prisma/prisma-module/prisma-module.module';
import { SendHumanTextService } from './app/send-human-text.service';
import { OpenAiModule } from 'src/fireworks-ia/open-ai.module';

@Module({
  imports: [
    OpenAiModule,
    PrismaModuleModule,
    EmpresaModule,
    ClienteModule,
    ChatModule,
    KnowledgeModule,
    FireworksIaModule,
    WhatsappMessageModule,
    CloudStorageDoSpacesModule,
    WhatsappApiClientModule,
  ],
  controllers: [ChatOrchestratorController, AgentChatController],
  providers: [
    ChatOrchestratorService,
    BroadCastMessageService,
    SendHumanTextService,
  ],
  exports: [ChatOrchestratorService],
})
export class ChatOrchestratorModule {}
