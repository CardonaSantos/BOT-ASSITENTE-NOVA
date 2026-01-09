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
import { MANUAL_TEXTO } from '../manual';

export const OPENAI_TOOLS: ChatCompletionTool[] = [
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
];

@Injectable()
export class OpenAiIaService {
  private readonly logger = new Logger(OpenAiIaService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly crmService: CrmService,
    @Inject(OPENAI_CLIENT) private readonly openai: OpenAI,
  ) {}

  async replyWithContext(params: {
    empresaNombre: string;
    history: ChatCompletionMessageParam[];
    question: string;
    imageUrls?: string[];
    context?: string;
  }): Promise<string> {
    const { empresaNombre, imageUrls, history, question, context } = params;

    const botParams = await this.prisma.bot.findUnique({
      where: { id: 1 },
      select: {
        temperature: true,
        maxCompletionTokens: true,
        historyPrompt: true,
        outputStyle: true,
        systemPrompt: true,
      },
    });

    if (!botParams) throw new Error('Configuración del bot no encontrada');

    const temperature = botParams.temperature ?? 0.3;
    const maxTokens = botParams.maxCompletionTokens ?? 512;
    const model = this.config.get<string>('OPENAI_MODEL') ?? 'gpt-4o-mini';

    // const contextSection = context
    //   ? `\nINFORMACIÓN DE BASE DE CONOCIMIENTO:\n"""${context}"""\n`
    //   : '';
    // ${contextSection}

    const finalSystemPrompt = `
      ${MANUAL_TEXTO || ''} 

      ERES EL ASISTENTE DE: ${empresaNombre}
      
      ${botParams.systemPrompt ?? ''}

      INSTRUCCIONES DE FORMATO:
      - Responde como un agente humano profesional.
      - Sé breve y directo.
      - NO uses Markdown (negritas, cursivas) ni listas complejas.
      - Usa máximo 1 emoji por mensaje.
    `.trim();

    const userContentParts: ChatCompletionContentPart[] = [
      { type: 'text', text: question },
    ];

    if (imageUrls && imageUrls.length > 0) {
      for (const url of imageUrls) {
        userContentParts.push({
          type: 'image_url',
          image_url: { url },
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
      });

      const responseMessage = response.choices[0].message;

      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        this.logger.log(
          `🛠 Ejecutando ${responseMessage.tool_calls.length} herramientas`,
        );

        messages.push(responseMessage);

        for (const toolCall of responseMessage.tool_calls) {
          if (
            toolCall.type === 'function' &&
            toolCall.function.name === 'crear_ticket_soporte'
          ) {
            const args = JSON.parse(toolCall.function.arguments);
            let contentResult = '';

            try {
              const ticket = await this.crmService.create({
                titulo: args.titulo,
                descripcion: args.descripcion,
              });
              contentResult = JSON.stringify({
                status: 'success',
                ticket_id: ticket.id,
              });
            } catch (err) {
              this.logger.error('Error CRM', err);
              contentResult = JSON.stringify({
                status: 'error',
                message: 'Fallo al crear ticket',
              });
            }

            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: contentResult,
            });
          }
        }

        // --- SEGUNDA LLAMADA ---
        const finalResponse = await this.openai.chat.completions.create({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
        });

        return finalResponse.choices[0].message.content ?? '';
      }

      return responseMessage.content ?? '';
    } catch (error) {
      this.logger.error('Error OpenAiService', error);
      return 'Lo siento, tuve un error interno procesando tu solicitud.';
    }
  }
}
