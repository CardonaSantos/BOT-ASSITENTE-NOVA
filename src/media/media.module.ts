import { Module } from '@nestjs/common';
import { MediaService } from './app/media.service';
import { MediaController } from './presentation/media.controller';
import { MEDIA_REPOSITORY_TK } from './domain/media.repository';
import { PrismaMediaRepository } from './infra/prisma-media.repository';
import { PrismaService } from 'src/prisma/prisma-service/prisma-service.service';

@Module({
  controllers: [MediaController],
  providers: [
    MediaService,
    PrismaService,
    {
      provide: MEDIA_REPOSITORY_TK,
      useClass: PrismaMediaRepository,
    },
  ],
})
export class MediaModule {}
