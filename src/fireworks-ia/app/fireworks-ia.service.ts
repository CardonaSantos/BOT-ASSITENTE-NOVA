import { Inject, Injectable, Logger } from '@nestjs/common';
import { FIREWORKS_CLIENT } from '../infraestructure/fireworks-ia.client';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';
import {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources/index';
import { PrismaService } from 'src/prisma/prisma-service/prisma-service.service';
import { CrmService } from 'src/crm/app/crm.service';
import { CreateCrmDto } from 'src/crm/dto/create-crm.dto';

// DEFINICION DE HERRAMIENTAS
const FIREWORKS_TOOLS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'crear_ticket_soporte',
      description: 'Crea un ticket de soporte técnico...',
      parameters: {
        type: 'object',
        properties: {
          titulo: {
            // Campo separado
            type: 'string',
            description:
              'Un título corto y descriptivo del problema. Ej: "Falla de conexión Wifi"',
          },
          descripcion: {
            // Campo separado
            type: 'string',
            description:
              'Detalle completo del problema técnico, fecha y nombre del cliente y su contacto.',
          },
        },
        required: ['titulo', 'descripcion'], // Obligar a llenar
      },
    },
  },
];

@Injectable()
export class FireworksIaService {
  private readonly chatModel: string;
  private readonly embeddingModel: string;

  private readonly logger = new Logger(FireworksIaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crmService: CrmService,

    @Inject(FIREWORKS_CLIENT) private readonly fireworks: OpenAI,
    private readonly config: ConfigService,
  ) {
    this.chatModel =
      this.config.get<string>('FIREWORKS_MODEL') ??
      'accounts/fireworks/models/gpt-oss-120b';

    this.embeddingModel =
      this.config.get<string>('FIREWORKS_EMBEDDINGS_MODEL') ??
      'fireworks/qwen3-embedding-8b';

    this.logger.log(
      `Modelos Fireworks cargados: chat=${this.chatModel}, embeddings=${this.embeddingModel}`,
    );
  }

  /**
   * CEREBRO DEL BOT RESPONDE, FIREWORKS
   */
  async replyWithContext(params: {
    empresaNombre: string;
    context: string;
    historyText: string;
    question: string;
  }): Promise<string> {
    const { empresaNombre, context, historyText, question } = params;

    const botParams = await this.prisma.bot.findUnique({
      where: { id: 1 },
      select: {
        id: true,
        temperature: true,
        presencePenalty: true,
        frequencyPenalty: true,
        maxCompletionTokens: true,
        topP: true,
        contextPrompt: true,
        historyPrompt: true,
        outputStyle: true,
        systemPrompt: true,
      },
    });

    if (!botParams) {
      throw new Error('Configuración del bot no encontrada');
    }

    const temperature = botParams.temperature ?? 0.3;
    const top_p = botParams.topP ?? 0.9;
    const presence_penalty = botParams.presencePenalty ?? 0;
    const frequency_penalty = botParams.frequencyPenalty ?? 0.2;
    const max_completion_tokens = botParams.maxCompletionTokens ?? 512;

    const contextSection =
      context && context.trim().length > 0
        ? `### CONTEXTO (base de conocimiento de la empresa "${empresaNombre}")

Usa únicamente la información que aparece aquí cuando sea relevante:

"""
${context}
"""

Instrucciones específicas para usar el contexto:
${botParams.contextPrompt ?? 'No inventes datos que no aparezcan explícitamente en el contexto. Si no encuentras la información, dilo claramente.'}
`
        : `### CONTEXTO

No se encontró contexto relevante en la base de conocimiento.
Si para responder necesitas información específica de la empresa, dilo claramente y no inventes datos.`;

    const historySection =
      historyText && historyText.trim().length > 0
        ? `### HISTORIAL RECIENTE DE LA CONVERSACIÓN

"""
${historyText}
"""

Instrucciones para usar el historial:
${botParams.historyPrompt ?? 'Mantén coherencia con lo ya dicho, pero no repitas textualmente todo el historial.'}
`
        : `### HISTORIAL

No hay historial reciente. Trata este mensaje como el inicio de una nueva conversación.`;

    const outputSection = `### ESTILO Y FORMATO DE RESPUESTA

${botParams.outputStyle ?? 'Responde en texto plano, claro, amable y profesional.'}`;

    const baseSystemPrompt = `
Eres el asistente virtual de soporte al cliente y agente del CRM de la empresa "${empresaNombre}".

Instrucciones base del sistema:
${botParams.systemPrompt ?? 'Sé amable, claro y útil. Responde siempre en español neutro.'}

${contextSection}

${historySection}

${outputSection}
  `.trim();

    // PRIMERA CALL
    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: baseSystemPrompt,
      },
      {
        role: 'user',
        content: question,
      },
    ];

    const initialResponse = await this.fireworks.chat.completions.create({
      model: this.chatModel,
      messages,
      tools: FIREWORKS_TOOLS,
      tool_choice: 'auto',
      max_completion_tokens: botParams.maxCompletionTokens ?? 512,
      temperature: botParams.temperature ?? 0.3,
    });

    const responseMessage = initialResponse.choices[0].message;
    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      this.logger.log(
        `El modelo requiere ejecutar ${responseMessage.tool_calls.length} funciones`,
      );

      //añadir el mensaje del asistente al historial
      messages.push(responseMessage);

      for (const toolCall of responseMessage.tool_calls) {
        // Validación que sea de tipo función para obtener el tipo de la funcion
        if (toolCall.type !== 'function') {
          this.logger.warn(`Tipo de tool no soportado: ${toolCall.type}`);
          continue;
        }

        const functionName = toolCall.function.name;

        this.logger.log(`Intentando ejecutar función: ${functionName}`);

        let toolOutputContent = '';

        if (functionName === 'crear_ticket_soporte') {
          try {
            const args = JSON.parse(toolCall.function.arguments);
            this.logger.log(`Argumentos recibidos: ${JSON.stringify(args)}`);

            const ticketDto: CreateCrmDto = {
              titulo: args.titulo || 'Ticket generado por Nuvia', // Fallback por seguridad
              descripcion: args.descripcion || 'Sin descripción proporcionada',
            };

            const resultadoCrm = await this.crmService.create(ticketDto);

            if (!resultadoCrm || typeof resultadoCrm !== 'object') {
              throw new Error('CRM devolvió respuesta inválida');
            }

            toolOutputContent = JSON.stringify({
              status: 'success',
              ticket_id: resultadoCrm?.id,
              mensaje: 'Ticket creado correctamente.',
            });
          } catch (error) {
            console.error(error);
            toolOutputContent = JSON.stringify({
              status: 'error',
              mensaje: 'Error conectando con CRM.',
            });
          }
        } else {
          toolOutputContent = JSON.stringify({ error: 'Función desconocida' });
        }

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: toolOutputContent,
        });
      }

      // SEGUNDA LLAMADA
      const finalDobleCall = await this.fireworks.chat.completions.create({
        model: this.chatModel,
        messages,
        max_completion_tokens,
        temperature,
      });

      return finalDobleCall.choices[0].message.content ?? '';
    }
    // CALL NORMAL
    return responseMessage.content ?? '';
  }

  /**
   * Genera embedding de un solo texto
   */
  async embedText(text: string): Promise<number[]> {
    const response = await this.fireworks.embeddings.create({
      model: this.embeddingModel,
      input: text,
    });

    const embedding = response.data[0].embedding as number[];
    this.logger.debug(
      `Embedding generado. Dimensión: ${embedding.length} tokens usados: ${response.usage?.prompt_tokens}`,
    );
    return embedding;
  }

  /**
   * Alias para usar en otros servicios (Knowledge, Orquestador, etc.)
   */
  async getEmbedding(text: string): Promise<number[]> {
    return this.embedText(text);
  }

  /**
   * Genera embeddings para varios textos hasta 8 por request
   */
  async embedMany(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const response = await this.fireworks.embeddings.create({
      model: this.embeddingModel,
      input: texts,
    });

    return response.data.map((data) => data.embedding as number[]);
  }
}
