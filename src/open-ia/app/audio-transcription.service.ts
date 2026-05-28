import { Inject, Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { toFile } from 'openai/uploads';
import { ConfigService } from '@nestjs/config';
import { OPENAI_CLIENT } from '../infraestructure/open-ia.client';

type TranscribeBufferParams = {
  buffer: Buffer;
  mimeType: string;
  filename: string;
  language?: string;
  prompt?: string;
};

@Injectable()
export class AudioTranscriptionService {
  private readonly logger = new Logger(AudioTranscriptionService.name);

  constructor(
    private readonly config: ConfigService,
    @Inject(OPENAI_CLIENT) private readonly openai: OpenAI,
  ) {}

  private buildDefaultPrompt() {
    const empresaNombre =
      this.config.get<string>('EMPRESA_NOMBRE') ?? 'Nova Sistemas';

    return [
      `Audio de WhatsApp para ${empresaNombre}.`,
      'Puede tratar sobre soporte técnico, pagos, comprobantes, facturas, ventas, productos, internet, router, fibra óptica, antena, POE, dirección, nombres, teléfonos o montos.',
      'Transcribe fielmente en español.',
      'Mantén nombres propios, números, montos y direcciones lo más exactos posible.',
      'No inventes contenido si no se escucha claro.',
    ].join(' ');
  }

  async transcribeBuffer(
    params: TranscribeBufferParams,
  ): Promise<string | null> {
    try {
      const file = await toFile(params.buffer, params.filename, {
        type: params.mimeType,
      });

      const result = await this.openai.audio.transcriptions.create({
        file,
        model:
          this.config.get<string>('OPENAI_TRANSCRIPTION_MODEL') ??
          'gpt-4o-mini-transcribe',
        response_format: 'text',
        language: params.language ?? 'es',
        prompt: params.prompt ?? this.buildDefaultPrompt(),
      });

      if (typeof result === 'string') {
        return result.trim() || null;
      }

      return String(result ?? '').trim() || null;
    } catch (error) {
      this.logger.error(
        'Error transcribiendo audio',
        error instanceof Error ? error.stack : String(error),
      );

      return null;
    }
  }
}
