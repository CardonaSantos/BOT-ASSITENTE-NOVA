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
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const VERIFY_TOKEN = this.config.get<string>('WHATSAPP_VERIFY_TOKEN');
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      this.logger.log(' Webhook de WhatsApp verificado correctamente');
      return res.status(HttpStatus.OK).send(challenge);
    }

    this.logger.warn(
      ` Falló la verificación del webhook: mode=${mode}, token=${token}`,
    );
    return res.sendStatus(HttpStatus.FORBIDDEN);
  }
  @Post('webhook')
  async handleWebhook(@Body() body: any, @Res() res: Response) {
    this.logger.debug(`📩 Webhook recibido: ${JSON.stringify(body)}`);

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
