import { Module } from '@nestjs/common';
import { KnowledgeController } from './presentation/knowledge.controller';
import { KnowledgeService } from './app/knowledge.service';
import { PrismaModuleModule } from 'src/prisma/prisma-module/prisma-module.module';
import { FireworksIaModule } from 'src/fireworks-ia/fireworks-ia.module';

@Module({
  imports: [PrismaModuleModule, FireworksIaModule],
  controllers: [KnowledgeController],
  providers: [KnowledgeService],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
