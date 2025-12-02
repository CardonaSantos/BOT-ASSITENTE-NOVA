import { Inject, Injectable, Logger } from '@nestjs/common';
import { FIREWORKS_CLIENT } from '../infraestructure/fireworks-ia.client';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';
import { ChatCompletionMessageParam } from 'openai/resources/index';
import { PrismaService } from 'src/prisma/prisma-service/prisma-service.service';

@Injectable()
export class FireworksIaService {
  private readonly chatModel: string;
  private readonly embeddingModel: string;

  private readonly logger = new Logger(FireworksIaService.name);

  constructor(
    private readonly prisma: PrismaService,

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

    const completion = await this.fireworks.chat.completions.create({
      model: this.chatModel,
      messages,
      max_completion_tokens,
      temperature,
      top_p,
      presence_penalty,
      frequency_penalty,
    });

    return completion.choices[0].message.content ?? '';
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
