import { Inject, Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { OPENAI_CLIENT } from '../infraestructure/open-ia.client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma-service/prisma-service.service';
import { ChatCompletionMessageParam } from 'openai/resources/index';

import { ChatCompletionTool } from 'openai/resources/chat/completions';
import { CrmService } from 'src/crm/app/crm.service';

export const OPENAI_TOOLS: ChatCompletionTool[] = [
  {
    type: 'function' as const,
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

    @Inject(OPENAI_CLIENT)
    private readonly openai: OpenAI,
  ) {}

  async replyWithContext(params: {
    empresaNombre: string;
    historyText: string;
    question: string;
    imageUrls?: string[];
    context?: string;
  }): Promise<string> {
    const { empresaNombre, imageUrls, historyText, question, context } = params;

    // 1. Obtener configuración del Bot
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

    if (!botParams) {
      throw new Error('Configuración del bot no encontrada');
    }

    const temperature = botParams.temperature ?? 0.3;
    const maxTokens = botParams.maxCompletionTokens ?? 512;
    const model = this.config.get<string>('OPENAI_MODEL') ?? 'gpt-4o-mini';

    // 2. Construir el System Prompt
    // NOTA: Si usas Chat Completions, el 'vector_store' no funciona automático.
    // Debes inyectar el contexto recuperado manualmente aquí (igual que en Fireworks).

    const contextSection = context
      ? `\nINFORMACIÓN DE BASE DE CONOCIMIENTO:\n"""${context}"""\n`
      : '';

    const systemPrompt = `
Eres el asistente virtual de soporte técnico de "${empresaNombre}".

REGLAS:
- No menciones RAG, documentos ni fuentes internas.
- No inventes información.
- Sigue estrictamente los protocolos.
- Usa funciones SOLO cuando corresponda.

${botParams.systemPrompt ?? ''}
${contextSection}
${historyText ? `HISTORIAL PREVIO:\n"""${historyText}"""\n${botParams.historyPrompt ?? ''}` : ''}

FORMATO DE RESPUESTA:
${botParams.outputStyle ?? 'Texto claro, profesional y humano'}
`.trim();

    const userContent: any[] = [{ type: 'text', text: question }];

    if (imageUrls?.length) {
      for (const url of imageUrls) {
        userContent.push({
          type: 'image_url',
          image_url: { url },
        });
      }
    }

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ];

    // 3. Preparar el historial de mensajes
    //     const messages: ChatCompletionMessageParam[] = [
    //       { role: 'system', content: systemPrompt },
    //     //   { role: 'user', content: question },

    //       {
    //   role: 'user',
    //   content: [
    //     { type: 'text', text: question },
    //     {
    //       type: 'image_url',
    //       image_url: { url: imageUrl }
    //     }
    //   ]
    // }

    //     ];

    try {
      // --- PRIMERA LLAMADA A OPENAI ---
      const response = await this.openai.chat.completions.create({
        model,
        messages,
        tools: OPENAI_TOOLS, // Solo tools tipo 'function'
        tool_choice: 'auto',
        temperature,
        max_tokens: maxTokens, // Nota: en versiones nuevas es max_completion_tokens
      });

      const responseMessage = response.choices[0].message;

      // 4. Verificar si el modelo quiere ejecutar una función
      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        this.logger.log(
          `🛠 El modelo solicita ejecutar ${responseMessage.tool_calls.length} herramientas`,
        );

        // Es obligatorio agregar el mensaje del asistente con los tool_calls al historial
        messages.push(responseMessage);

        // 5. Ejecutar las funciones solicitadas
        for (const toolCall of responseMessage.tool_calls) {
          if (toolCall.type !== 'function') continue;

          const { name, arguments: rawArgs } = toolCall.function;

          if (name === 'crear_ticket_soporte') {
            const args = JSON.parse(rawArgs);

            let functionResponse = '';

            try {
              const ticket = await this.crmService.create({
                titulo: args.titulo,
                descripcion: args.descripcion,
              });

              functionResponse = JSON.stringify({
                status: 'success',
                ticket_id: ticket.id,
              });
            } catch (err) {
              this.logger.error('Error creando ticket', err);
              functionResponse = JSON.stringify({
                status: 'error',
                message: 'Error conectando con CRM',
              });
            }

            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: functionResponse,
            });
          }
        }

        // --- SEGUNDA LLAMADA (Para que el bot genere la respuesta final al usuario) ---
        const finalResponse = await this.openai.chat.completions.create({
          model,
          messages,
          // Opcional: puedes quitar las tools aquí si no quieres que llame a otra función encadenada
          // tools: OPENAI_TOOLS,
          temperature,
          max_tokens: maxTokens,
        });

        return finalResponse.choices[0].message.content ?? '';
      }

      // Si no hubo tools, devolver respuesta normal
      return responseMessage.content ?? '';
    } catch (error) {
      this.logger.error('Error en llamada a OpenAI', error);
      throw error;
    }
  }
}
