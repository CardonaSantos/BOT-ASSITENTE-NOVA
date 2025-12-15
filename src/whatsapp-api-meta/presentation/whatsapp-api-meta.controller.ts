import { Get, Patch, Param, Delete, Query } from '@nestjs/common';
import { CreateWhatsappApiMetaDto } from '../dto/create-whatsapp-api-meta.dto';
import { UpdateWhatsappApiMetaDto } from '../dto/update-whatsapp-api-meta.dto';
import { ConfigService } from '@nestjs/config';
import { WhatsappApiMetaService } from '../app/whatsapp-api-meta.service';
import { FireworksIaService } from 'src/fireworks-ia/app/fireworks-ia.service';
import { ChatOrchestratorModule } from 'src/chat-orchestrator/chat-orchestrator.module';
import { ChatChannel } from '@prisma/client';
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
            const from = message.from; // número del cliente
            const type = message.type;

            if (type === 'text') {
              const text = message.text?.body ?? '';

              // 1) Orquestador: empresa + cliente + sesión + historial + reply
              const result = await this.orquestador.handleIncomingMessage({
                empresaSlug: 'nova-sistemas', // fija o configurable
                empresaNombreFallback: 'Nova Sistemas', // nombre legible
                telefono: from,
                texto: text,
                nombreClienteWhatsApp: profileName,
                canal: ChatChannel.WHATSAPP,
              });

              // result.reply es lo que el cerebro (IA) respondió
              const reply = result.reply;

              // 2) Enviamos respuesta por WhatsApp al mismo número
              await this.whatsappApiMetaService.sendText(from, reply);
            }
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
