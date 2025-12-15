import { Injectable, Inject } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { CloudStorageRepository } from '../domain/cloud-storage.repository';
import { UploadInput, UploadResult } from '../domain/types';
import { generarKeyWhatsapp } from 'src/Utils/enrutador-dospaces';

function cleanName(name?: string) {
  if (!name) return 'file';
  return name
    .replace(/[^\w.\-()+ ]/g, '') // limpia raro
    .replace(/\s+/g, '_')
    .slice(0, 120);
}

function nowPath() {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}/${mm}/${dd}`;
}

@Injectable()
export class DoSpacesStorage implements CloudStorageRepository {
  constructor(
    @Inject('DO_SPACES_S3') private readonly s3: S3Client,
    @Inject('DO_SPACES_CFG')
    private readonly cfg: {
      bucket: string;
      cdnBase: string;
    },
  ) {}

  async upload(input: UploadInput): Promise<UploadResult> {
    const folder = (input.folder ?? 'uploads').replace(/^\/+|\/+$/g, '');
    const safeName = cleanName(input.originalName);
    const uuid = (
      globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
    ).toString();

    const key = input.key ?? `${folder}/${nowPath()}/${uuid}-${safeName}`;

    const cmd = new PutObjectCommand({
      Bucket: this.cfg.bucket,
      Key: key,
      Body: input.buffer,
      ContentType: input.contentType,
      ACL: input.publicRead === false ? undefined : 'public-read', // para CDN público
    });

    const res = await this.s3.send(cmd);

    const cdnUrl = `${this.cfg.cdnBase}/${key}`;

    return {
      key,
      url: `${this.cfg.cdnBase}/${key}`,
      bucket: this.cfg.bucket,
      contentType: input.contentType,
      size: input.buffer.length,
      etag: res.ETag,
    };
  }

  async delete(key: string): Promise<void> {
    const cmd = new DeleteObjectCommand({
      Bucket: this.cfg.bucket,
      Key: key,
    });
    await this.s3.send(cmd);
  }
}
