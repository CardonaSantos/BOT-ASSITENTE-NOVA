import { Module } from '@nestjs/common';
import { FireworksIaController } from './presentation/fireworks-ia.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FIREWORKS_CLIENT } from './infraestructure/fireworks-ia.client';
import OpenAI from 'openai';
import { FireworksIaService } from './app/fireworks-ia.service';
import { PrismaModuleModule } from 'src/prisma/prisma-module/prisma-module.module';
import { CrmService } from 'src/crm/app/crm.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [ConfigModule, PrismaModuleModule, HttpModule],
  controllers: [FireworksIaController],
  providers: [
    CrmService,
    {
      provide: FIREWORKS_CLIENT,
      useFactory: (config: ConfigService) => {
        return new OpenAI({
          apiKey: config.get('FIREWORKS_API_KEY'),
          baseURL:
            config.get('FIREWORKS_BASE_URL') ??
            'https://api.fireworks.ai/inference/v1',
        });
      },
      inject: [ConfigService],
    },
    FireworksIaService,
  ],
  exports: [FireworksIaService],
})
export class FireworksIaModule {}
