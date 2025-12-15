import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';

import { DoSpacesStorage } from './infrastructure/do-spaces.storage';
import {
  CLOUD_STORAGE_REPO,
  DO_SPACES_CFG,
  DO_SPACES_S3,
} from './cloud-storage.tokens';
import { CloudStorageService } from './app/cloud-storage-dospaces.service';
// import { CloudStorageController } from './presentation/cloud-storage.controller';

@Module({
  imports: [ConfigModule],
  // controllers: [CloudStorageController], // opcional
  providers: [
    {
      provide: DO_SPACES_CFG,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const cfg = {
          region: config.get<string>('DO_SPACES_REGION'),
          endpoint: config.get<string>('DO_SPACES_ENDPOINT'),
          accessKeyId: config.get<string>('DO_SPACES_KEY'),
          secretAccessKey: config.get<string>('DO_SPACES_SECRET'),
          bucket: config.get<string>('DO_SPACES_BUCKET'),
          cdnBase: config.get<string>('DO_SPACES_CDN_BASE'),
        };

        for (const [k, v] of Object.entries(cfg)) {
          if (!v) throw new Error(`Falta variable de entorno: ${k}`);
        }
        return cfg;
      },
    },

    {
      provide: DO_SPACES_S3,
      inject: [DO_SPACES_CFG],
      useFactory: (cfg: any) =>
        new S3Client({
          region: cfg.region,
          endpoint: cfg.endpoint,
          forcePathStyle: true,
          credentials: {
            accessKeyId: cfg.accessKeyId,
            secretAccessKey: cfg.secretAccessKey,
          },
        }),
    },

    // (Opcional) preflight al boot: valida bucket/credenciales
    {
      provide: 'DO_SPACES_BOOT_CHECK',
      inject: [DO_SPACES_S3, DO_SPACES_CFG],
      useFactory: async (s3: S3Client, cfg: any) => {
        await s3.send(new HeadBucketCommand({ Bucket: cfg.bucket }));
        return true;
      },
    },

    {
      provide: CLOUD_STORAGE_REPO,
      useClass: DoSpacesStorage,
    },

    CloudStorageService,
  ],
  exports: [CloudStorageService],
})
export class CloudStorageDoSpacesModule {}
