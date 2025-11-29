import { Inject, Injectable, Logger } from '@nestjs/common';
import { FIREWORKS_CLIENT } from '../infraestructure/fireworks-ia.client';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';
import { ChatCompletionMessageParam } from 'openai/resources/index';

@Injectable()
export class FireworksIaService {
  private readonly chatModel: string;
  private readonly embeddingModel: string;

  private readonly logger = new Logger(FireworksIaService.name);

  constructor(
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

    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content:
          `Eres el asistente de soporte al cliente y agente del CRM de ${empresaNombre}. ` +
          `Respondes siempre alegre, amable y creativo, pero muy claro y preciso.`,
      },
      {
        role: 'system',
        content:
          `Contexto de la base de conocimiento (puede estar incompleto):\n` +
          (context || '- sin contexto -'),
      },
      {
        role: 'system',
        content:
          `Historial reciente de la conversación:\n` +
          (historyText || '- sin historial -'),
      },
      {
        role: 'user',
        content: question, // 👈 aquí va SOLO la pregunta actual
      },
    ];

    const completion = await this.fireworks.chat.completions.create({
      model: this.chatModel,
      messages,
      max_completion_tokens: 500,
      temperature: 0.4,
      top_p: 0.9,
      presence_penalty: 0.0,
      frequency_penalty: 0.2,
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
