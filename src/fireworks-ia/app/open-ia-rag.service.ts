import { Inject, Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { OPENAI_CLIENT } from '../infraestructure/open-ia.client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma-service/prisma-service.service';
import { ChatCompletionMessageParam } from 'openai/resources/index';
import {
  ChatCompletionContentPart,
  ChatCompletionTool,
} from 'openai/resources/chat/completions';
import { CrmService } from 'src/crm/app/crm.service';
import { PosFunctionsService } from 'src/pos-functions/app/pos-functions.service';

export const OPENAI_TOOLS: ChatCompletionTool[] = [
  // CREACION DE TICKET DE SOPORTE TECNICO
  {
    type: 'function',
    function: {
      name: 'crear_ticket_soporte',
      description: 'Crea un ticket de soporte técnico en el CRM',
      parameters: {
        type: 'object',
        properties: {
          titulo: { type: 'string', description: 'Título corto del problema' },
          descripcion: {
            type: 'string',
            description: 'Descripción detallada del problema',
          },
        },
        required: ['titulo', 'descripcion'],
        additionalProperties: false,
      },
    },
  },
  // FUNCION PLACEHOLDER
  {
    type: 'function',
    function: {
      name: 'buscar_producto_en_pos',
      description:
        'Consulta el inventario del POS en tiempo real. Úsala cuando el cliente pregunte por precios, stock o disponibilidad de un producto. Retorna coincidencias con stock desglosado por sucursal. Informa al cliente explícitamente en qué sucursal hay unidades disponibles.',
      parameters: {
        type: 'object',
        properties: {
          producto: {
            type: 'string',
            description:
              'Término de búsqueda principal (nombre del producto). Convertir a minúsculas. Ej: "galaxy s24", "funda", "cargador".',
          },
          categorias: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Lista de marcas o categorías mencionadas. Ej: Si busca "Teléfonos Samsung", aqui va ["samsung"].',
          },
        },
        required: ['producto'],
        additionalProperties: false,
      },
    },
  },
];

@Injectable()
export class OpenAiIaService {
  private readonly logger = new Logger(OpenAiIaService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly crmService: CrmService,
    private readonly pos_erp_Service: PosFunctionsService,

    @Inject(OPENAI_CLIENT) private readonly openai: OpenAI,
  ) {}

  async replyWithContext(params: {
    empresaNombre: string;
    history: ChatCompletionMessageParam[];
    question: string;
    manual: string;
    imageUrls?: string[];
  }): Promise<string> {
    const { empresaNombre, imageUrls, history, question, manual } = params;

    const botParams = await this.prisma.bot.findUnique({
      where: { id: 1 },
      select: {
        systemPrompt: true,
        temperature: true,
        maxCompletionTokens: true,
        frequencyPenalty: true,
        presencePenalty: true,
        topP: true,
      },
    });

    if (!botParams) throw new Error('Configuración del bot no encontrada');

    const temperature = botParams.temperature ?? 0.3; // Rango: 0 a 2
    const maxTokens = botParams.maxCompletionTokens ?? 512;
    const topP = botParams.topP ?? 1.0; // Rango: 0 a 1 (Default 1)
    const frequencyPenalty = botParams.frequencyPenalty ?? 0; // Rango: -2 a 2 (Default 0)
    const presencePenalty = botParams.presencePenalty ?? 0; // Rango: -2 a 2 (Default 0)

    const model = this.config.get<string>('OPENAI_MODEL') ?? 'gpt-4o-mini';

    const finalSystemPrompt = `
      ${manual || ''} 
      ERES EL ASISTENTE DE: ${empresaNombre}
      ${botParams.systemPrompt ?? ''}
    `.trim();

    const userContentParts: ChatCompletionContentPart[] = [];

    if (question && question.trim().length > 0) {
      userContentParts.push({ type: 'text', text: question });
    } else if (!imageUrls || imageUrls.length === 0) {
      userContentParts.push({ type: 'text', text: 'Hola' });
    }

    if (imageUrls && imageUrls.length > 0) {
      for (const url of imageUrls) {
        userContentParts.push({
          type: 'image_url',
          image_url: { url: url, detail: 'auto' },
        });
      }
    }

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: finalSystemPrompt },
      ...history,
      { role: 'user', content: userContentParts },
    ];

    try {
      // --- PRIMERA LLAMADA ---
      const response = await this.openai.chat.completions.create({
        model,
        messages,
        tools: OPENAI_TOOLS,
        tool_choice: 'auto',
        temperature,
        max_tokens: maxTokens,
        presence_penalty: presencePenalty,
        top_p: topP,
        frequency_penalty: frequencyPenalty,
      });

      const responseMessage = response.choices[0].message;

      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        this.logger.log(
          ` Ejecutando ${responseMessage.tool_calls.length} herramientas`,
        );

        messages.push(responseMessage);

        for (const toolCall of responseMessage.tool_calls) {
          if (toolCall.type !== 'function') continue;

          const functionName = toolCall.function.name;

          // --- CORRECCIÓN 2: JSON.PARSE (NO STRINGIFY) ---
          let functionArgs: any = {};
          try {
            functionArgs = JSON.parse(toolCall.function.arguments);
          } catch (e) {
            this.logger.error('Error parseando argumentos de OpenAI', e);
          }

          let toolResultContent = '';

          try {
            switch (functionName) {
              case 'crear_ticket_soporte':
                this.logger.debug(`Ejecutando funcion: ${functionName}`);
                // Ahora sí functionArgs es un objeto
                const ticket = await this.crmService.create({
                  titulo: functionArgs.titulo,
                  descripcion: functionArgs.descripcion,
                });
                toolResultContent = JSON.stringify({
                  status: 'success',
                  ticket_id: ticket.id,
                  msg: 'Ticket creado',
                });
                break;

              case 'buscar_producto_en_pos':
                this.logger.debug(
                  `############Ejecutando funcion######: ${functionName}`,
                );

                const dto = {
                  producto: functionArgs.producto,
                  categorias: functionArgs.categorias ?? [],
                };

                this.logger.log(
                  `DTO enviado al ERP: \n${JSON.stringify(dto, null, 2)}`,
                );

                const productos_found = await this.pos_erp_Service.search(dto);

                if (!productos_found) {
                  toolResultContent = JSON.stringify([]);
                } else {
                  toolResultContent = JSON.stringify(productos_found);
                }

                this.logger.log(`Resultados POS: ${toolResultContent}`);

                this.logger.log(
                  `PRODUCTOS FOUND: \n${JSON.stringify(productos_found, null, 2)}`,
                );

                break;

              default:
                toolResultContent = JSON.stringify({
                  error: 'Función no implementada',
                });
                break;
            }
          } catch (error) {
            this.logger.error(`Error ejecutando ${functionName}`, error);
            toolResultContent = JSON.stringify({
              status: 'error',
              message: 'Fallo interno al ejecutar acción',
            });
          }

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: toolResultContent,
          });
        }

        // --- SEGUNDA LLAMADA ---
        const finalResponse = await this.openai.chat.completions.create({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          presence_penalty: presencePenalty,
          top_p: topP,
          frequency_penalty: frequencyPenalty,
        });

        return finalResponse.choices[0].message.content ?? '';
      }

      return responseMessage.content ?? '';
    } catch (error) {
      this.logger.error('Error OpenAiService', error);
      if (error instanceof OpenAI.APIError) {
        this.logger.error(JSON.stringify(error.error));
      }
      return 'Lo siento, tuve un error interno procesando tu solicitud.';
    }
  }
}
