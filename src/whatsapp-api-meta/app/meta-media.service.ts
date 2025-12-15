import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class MetaWhatsAppMediaService {
  private readonly logger = new Logger(MetaWhatsAppMediaService.name);
  private readonly token: string;

  constructor(
    private readonly config: ConfigService,
    private readonly http: HttpService,
  ) {
    this.token = this.config.get<string>('WHATSAPP_API_TOKEN') ?? '';
    if (!this.token) throw new Error('WHATSAPP_API_TOKEN faltante');
  }

  /**
   *  Pide a Meta el metadata del media (trae un URL temporal)
   * @param mediaId ID DEL METADATO
   * @returns objeto que contiene la URL de descarga
   */
  async getMediaUrl(mediaId: string): Promise<{
    url: string;
    mime_type?: string;
    sha256?: string;
    file_size?: number;
  }> {
    try {
      const resp = await lastValueFrom(
        this.http.get(`https://graph.facebook.com/v21.0/${mediaId}`, {
          headers: { Authorization: `Bearer ${this.token}` },
        }),
      );

      // resp.data típicamente: { messaging_product:"whatsapp", url:"...", mime_type:"...", sha256:"...", file_size:... }
      return resp.data;
    } catch (err: any) {
      this.logger.error(
        `Error getMediaUrl(${mediaId}): ${err?.message ?? err}`,
        err?.response?.data,
      );
      throw new InternalServerErrorException('No se pudo obtener URL de media');
    }
  }

  /**
   * Descarga el binario desde el URL temporal
   * @param url URL temporal de descarga de MetaDato
   * @returns Retorna un buffer
   */
  async downloadMediaBuffer(url: string): Promise<Buffer> {
    try {
      const resp = await lastValueFrom(
        this.http.get(url, {
          responseType: 'arraybuffer',
          headers: { Authorization: `Bearer ${this.token}` },
        }),
      );
      return Buffer.from(resp.data);
    } catch (err: any) {
      this.logger.error(
        `Error downloadMediaBuffer: ${err?.message ?? err}`,
        err?.response?.data,
      );
      throw new InternalServerErrorException('No se pudo descargar el archivo');
    }
  }

  /** Conveniencia: dado mediaId te regresa todo */
  async fetchMedia(mediaId: string) {
    const meta = await this.getMediaUrl(mediaId);
    const buffer = await this.downloadMediaBuffer(meta.url);
    return { buffer, meta };
  }
}
