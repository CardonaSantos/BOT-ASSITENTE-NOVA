import { Module } from '@nestjs/common';
import { BotService } from './app/bot.service';
import { BotController } from './presentation/bot.controller';
import { PrismaService } from 'src/prisma/prisma-service/prisma-service.service';
import { PrismaModuleModule } from 'src/prisma/prisma-module/prisma-module.module';
import { BotRepository } from './infraestructure/prisma-bot.repository';
import { BOT_REPOSITORY } from './domain/bot.repository';

@Module({
  imports: [PrismaModuleModule],
  controllers: [BotController],
  providers: [
    BotService,
    {
      useClass: BotRepository,
      provide: BOT_REPOSITORY,
    },
  ],
})
export class BotModule {}
