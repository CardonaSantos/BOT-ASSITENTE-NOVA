import { Module } from '@nestjs/common';
import { ChatOrchestratorController } from './presentation/chat-orchestrator.controller';
import { ChatOrchestratorService } from './app/chat-orchestrator.service';
import { EmpresaModule } from 'src/empresa/empresa.module';
import { ClienteModule } from 'src/cliente/cliente.module';
import { ChatModule } from 'src/chat/chat.module';
import { KnowledgeModule } from 'src/knowledge/knowledge.module';
import { FireworksIaModule } from 'src/fireworks-ia/fireworks-ia.module';

@Module({
  imports: [
    EmpresaModule,
    ClienteModule,
    ChatModule,
    KnowledgeModule,
    FireworksIaModule,
  ],
  controllers: [ChatOrchestratorController],
  providers: [ChatOrchestratorService],
  exports: [ChatOrchestratorService],
})
export class ChatOrchestratorModule {}
