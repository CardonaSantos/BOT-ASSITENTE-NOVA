import { Inject, Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { OPENAI_CLIENT } from '../infraestructure/open-ia.client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma-service/prisma-service.service';

@Injectable()
export class OpenAiIaService {
  private readonly logger = new Logger(OpenAiIaService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,

    @Inject(OPENAI_CLIENT)
    private readonly openai: OpenAI,
  ) {}

  async replyWithContext(params: {
    empresaNombre: string;
    historyText: string;
    question: string;
  }): Promise<string> {
    const { empresaNombre, historyText, question } = params;

    const botParams = await this.prisma.bot.findUnique({
      where: { id: 1 },
      select: {
        temperature: true,
        presencePenalty: true,
        frequencyPenalty: true,
        maxCompletionTokens: true,
        topP: true,
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

    const vectorStoreId = this.config.get<string>('OPEN_IA_VS');
    const model = this.config.get<string>('OPENAI_MODEL') ?? 'gpt-4.1-mini';

    this.logger.log(`➡️ OpenAI model: ${model}`);
    this.logger.log(`➡️ OpenAI vector store: ${vectorStoreId}`);
    this.logger.log(`➡️ Question length: ${question.length}`);
    this.logger.log(`➡️ History length: ${historyText?.length ?? 0}`);

    const systemPrompt = `
Eres el asistente virtual de soporte al cliente y agente del CRM de la empresa "${empresaNombre}".

REGLAS ESTRICTAS:
- No menciones documentos, protocolos, RAG ni fuentes internas.
- No inventes información.
- Si la información no está disponible, dilo claramente.
- Responde como un asesor humano profesional.

${botParams.systemPrompt ?? ''}

${historyText ? `HISTORIAL RECIENTE:\n"""${historyText}"""\n${botParams.historyPrompt ?? ''}` : ''}

FORMATO DE RESPUESTA:
${botParams.outputStyle ?? 'Texto plano, claro y profesional.'}
`.trim();

    const response = await this.openai.responses.create({
      model,

      input: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question },
      ],

      tools: [
        {
          type: 'file_search',
          vector_store_ids: [vectorStoreId],
        },
      ],
      tool_choice: 'auto',

      temperature,
      max_output_tokens: maxTokens,
    });

    return response.output_text ?? '';
  }
}
