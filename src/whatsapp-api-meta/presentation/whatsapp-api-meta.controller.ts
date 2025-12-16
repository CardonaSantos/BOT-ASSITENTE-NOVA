import { Get, Patch, Param, Delete, Query } from '@nestjs/common';
import { CreateWhatsappApiMetaDto } from '../dto/create-whatsapp-api-meta.dto';
import { UpdateWhatsappApiMetaDto } from '../dto/update-whatsapp-api-meta.dto';
import { ConfigService } from '@nestjs/config';
import { WhatsappApiMetaService } from '../app/whatsapp-api-meta.service';
import { FireworksIaService } from 'src/fireworks-ia/app/fireworks-ia.service';
import { ChatOrchestratorModule } from 'src/chat-orchestrator/chat-orchestrator.module';
import { ChatChannel, WazDirection } from '@prisma/client';
import { ChatOrchestratorService } from 'src/chat-orchestrator/app/chat-orchestrator.service';
import { logWhatsAppWebhook } from 'src/Utils/wa-webhook-logger';

import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  Logger,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { MediaData } from 'src/Utils/mediaData.interface';
import {
  extFromFilename,
  extFromMime,
  mapMetaTypeToWaz,
} from 'src/Utils/extractors';

@Controller('whatsapp-meta')
export class WhatsappApiMetaController {
  private readonly logger = new Logger(WhatsappApiMetaController.name);

  constructor(
    private readonly whatsappApiMetaService: WhatsappApiMetaService,
    private readonly fireworksIa: FireworksIaService,
    private readonly config: ConfigService,
    private readonly orquestador: ChatOrchestratorService,
  ) {}

  /**
   * El modelo de IA cerebro responde, prueba
   * @param body
   * @returns
   */
  @Post('send-test')
  async sentTest(@Body() body: { to: string; message: string }) {
    // const reply = await this.fireworksIa.simpleReply(body.message);
    // await this.whatsappApiMetaService.sendText(body.to, reply);
    // return { ok: true };
  }

  /**
   * CONTROLADOR PARA VERIFICACION DE META -> WHATSAPP
   * @param mode
   * @param token
   * @param challenge
   * @param res
   * @returns
   */
  @Get('webhook')
  verifyWebhook(@Query() query: any, @Res() res: Response) {
    // LOG CRÍTICO: Ver qué llega realmente (si llega algo)
    this.logger.log('🔍 Query params recibidos:', JSON.stringify(query));

    // 2. EL ARREGLO MÁGICO: Soportar anidación
    // NestJS suele parsear "hub.mode" como query.hub.mode
    const mode = query['hub.mode'] || query?.hub?.mode;
    const token = query['hub.verify_token'] || query?.hub?.verify_token;
    const challenge = query['hub.challenge'] || query?.hub?.challenge;

    this.logger.log(
      `🔍 Interpretado: Mode=${mode}, Token=${token}, Challenge=${challenge}`,
    );

    const VERIFY_TOKEN = this.config.get<string>('WHATSAPP_VERIFY_TOKEN');

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      this.logger.log('✅ ¡VERIFICADO! Respondiendo challenge...');
      // Meta espera el challenge plano (texto), no JSON
      return res.status(HttpStatus.OK).send(challenge.toString());
    }

    this.logger.warn(
      `⛔ Falló: Token recibido [${token}] vs Esperado [${VERIFY_TOKEN}]`,
    );
    return res.sendStatus(HttpStatus.FORBIDDEN);
  }

  @Post('webhook')
  async handleWebhook(
    @Body() body: any,
    @Req() req: Request, // 👈 1. Inyectamos la Request para leer headers
    @Res() res: Response,
  ) {
    this.logger.debug(`📩 Webhook recibido: ${JSON.stringify(body)}`);

    logWhatsAppWebhook(this.logger, req, body);

    // Validación de seguridad básica
    if (body.object !== 'whatsapp_business_account') {
      return res.sendStatus(HttpStatus.OK);
    }

    try {
      for (const entry of body.entry ?? []) {
        for (const change of entry.changes ?? []) {
          const value = change.value;
          const messages = value?.messages;

          if (!messages || !Array.isArray(messages)) continue;

          // nombre que WhatsApp manda en contacts[0].profile.name (suele venir así)
          const profileName = value?.contacts?.[0]?.profile?.name;

          for (const message of messages) {
            const from = message.from;
            const type = message.type;

            // Variables para unificar la extracción
            let textoExtraido = '';
            let mediaData: MediaData | null = null;

            const wamid = String(message.id);
            const timestamp = BigInt(message.timestamp); // Meta manda string unix en segundos
            const replyToWamid = message?.context?.id ?? null;

            const toNumber =
              value?.metadata?.display_phone_number ??
              process.env.WHATSAPP_DISPLAY_NUMBER ??
              '';

            const direction = WazDirection.INBOUND;
            const typeEnum = mapMetaTypeToWaz(type);

            // 🔍 EXTRACTOR DE DATOS
            switch (type) {
              case 'text':
                textoExtraido = message.text?.body ?? '';
                break;

              case 'image': {
                const mimeType = message.image?.mime_type ?? null;
                textoExtraido = message.image?.caption ?? '[Imagen]';

                mediaData = {
                  mediaId: message.image?.id,
                  kind: 'image',
                  mimeType,
                  filename: null,
                  extension: extFromMime(mimeType),
                  direction: direction,
                };
                break;
              }

              case 'document': {
                const mimeType = message.document?.mime_type ?? null;
                const filename = message.document?.filename ?? null;
                textoExtraido =
                  message.document?.caption ??
                  `[Documento${filename ? `: ${filename}` : ''}]`;

                mediaData = {
                  mediaId: message.document?.id,
                  kind: 'document',
                  mimeType,
                  filename,
                  extension: extFromFilename(filename) ?? extFromMime(mimeType),
                  direction: direction,
                };
                break;
              }

              case 'audio': {
                const mimeType = message.audio?.mime_type ?? null;
                textoExtraido = '[Audio]';

                mediaData = {
                  mediaId: message.audio?.id,
                  kind: 'audio',
                  mimeType,
                  filename: null,
                  extension: extFromMime(mimeType) ?? 'ogg', // WhatsApp suele ser ogg/opus
                  direction: direction,
                };
                break;
              }

              default:
                textoExtraido = `[${type}]`;
            }
            // Ahora le pasas el objeto enriquecido
            await this.orquestador.handleIncomingMessage({
              empresaSlug: 'nova-sistemas',
              empresaNombreFallback: 'Nova Sistemas',
              telefono: from,
              nombreClienteWhatsApp: profileName,
              canal: ChatChannel.WHATSAPP,

              wamid,
              timestamp,
              replyToWamid,

              direction,
              to: toNumber,

              type: typeEnum,
              texto: textoExtraido,
              media: mediaData,
            });
          }
        }
      }
      return res.sendStatus(HttpStatus.OK);
    } catch (error) {
      this.logger.error('Error manejando webhook de WhatsApp', error as any);
      return res.sendStatus(HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
