import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaModuleModule } from 'src/prisma/prisma-module/prisma-module.module';
import { OpenAiIaService } from './app/open-ia-rag.service';
import { OPENAI_CLIENT } from './infraestructure/open-ia.client';

@Module({
  imports: [ConfigModule, PrismaModuleModule],
  providers: [
    {
      provide: OPENAI_CLIENT,
      useFactory: (config: ConfigService) => {
        return new OpenAI({
          apiKey: config.get<string>('OPENAI_API_KEY'),
        });
      },
      inject: [ConfigService],
    },
    OpenAiIaService,
  ],
  exports: [OpenAiIaService],
})
export class OpenAiModule {}
