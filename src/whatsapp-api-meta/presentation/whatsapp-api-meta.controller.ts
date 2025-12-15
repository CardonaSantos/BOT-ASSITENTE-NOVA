import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Logger,
  Query,
  HttpStatus,
  Res,
  Req,
  HttpCode,
} from '@nestjs/common';
import { CreateWhatsappApiMetaDto } from '../dto/create-whatsapp-api-meta.dto';
import { UpdateWhatsappApiMetaDto } from '../dto/update-whatsapp-api-meta.dto';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { WhatsappApiMetaService } from '../app/whatsapp-api-meta.service';
import { FireworksIaService } from 'src/fireworks-ia/app/fireworks-ia.service';
import { ChatOrchestratorModule } from 'src/chat-orchestrator/chat-orchestrator.module';
import { ChatChannel } from '@prisma/client';
import { ChatOrchestratorService } from 'src/chat-orchestrator/app/chat-orchestrator.service';
import { logWhatsAppWebhook } from 'src/Utils/wa-webhook-logger';

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
  @HttpCode(200)
  handleWebhook(@Req() req: Request, @Body() body: any) {
    // responder rápido sin esperar nada
    void (async () => {
      try {
        logWhatsAppWebhook(this.logger, req, body);

        if (body?.object !== 'whatsapp_business_account') return;

        for (const entry of body.entry ?? []) {
          for (const change of entry.changes ?? []) {
            const value = change.value;
            const messages = value?.messages;
            if (!Array.isArray(messages) || messages.length === 0) continue;

            const profileName = value?.contacts?.[0]?.profile?.name;

            for (const message of messages) {
              if (message.type !== 'text') continue;

              const from = message.from;
              const text = message.text?.body ?? '';

              const result = await this.orquestador.handleIncomingMessage({
                empresaSlug: 'nova-sistemas',
                empresaNombreFallback: 'Nova Sistemas',
                telefono: from,
                texto: text,
                nombreClienteWhatsApp: profileName,
                canal: ChatChannel.WHATSAPP,
              });

              await this.whatsappApiMetaService.sendText(from, result.reply);
            }
          }
        }
      } catch (error) {
        this.logger.error('Error procesando webhook de WhatsApp', error as any);
      }
    })();

    return 'OK';
  }
}
