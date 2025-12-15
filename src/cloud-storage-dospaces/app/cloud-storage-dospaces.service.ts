import { Injectable, Inject } from '@nestjs/common';
import { CloudStorageRepository } from '../domain/cloud-storage.repository';
import { UploadResult } from '../domain/types';
import { CLOUD_STORAGE_REPO } from '../cloud-storage.tokens';

@Injectable()
export class CloudStorageService {
  constructor(
    @Inject(CLOUD_STORAGE_REPO)
    private readonly storage: CloudStorageRepository,
  ) {}

  // Para multer (imagenes, videos, pdf, audio, etc.)
  async uploadBuffer(params: {
    buffer: Buffer;
    contentType: string;
    key: string;
    publicRead?: boolean;
  }) {
    return this.storage.upload({
      buffer: params.buffer,
      contentType: params.contentType,
      key: params.key,
      publicRead: params.publicRead ?? true,
    });
  }

  // Para texto (ej: generar .txt o .json y subirlo)
  async uploadText(
    text: string,
    opts: { contentType?: string; filename?: string; folder?: string },
  ): Promise<UploadResult> {
    return this.storage.upload({
      buffer: Buffer.from(text, 'utf8'),
      contentType: opts.contentType ?? 'text/plain; charset=utf-8',
      originalName: opts.filename ?? 'document.txt',
      folder: opts.folder,
      publicRead: true,
    });
  }

  async deleteByKey(key: string) {
    return this.storage.delete(key);
  }
}
