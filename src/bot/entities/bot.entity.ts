import { BotStatus } from '@prisma/client';

export class Bot {
  constructor(
    public readonly id: number | null,
    public readonly empresaId: number,

    public nombre: string,
    public slug: string,
    public descripcion: string | null,

    public provider: string,
    public model: string,

    public systemPrompt: string,
    public contextPrompt: string | null,
    public historyPrompt: string | null,
    public outputStyle: string | null,

    public maxCompletionTokens: number,
    public temperature: number,
    public topP: number,
    public frequencyPenalty: number,
    public presencePenalty: number,
    public maxHistoryMessages: number,

    public status: BotStatus,

    public readonly creadoEn?: Date,
    public readonly actualizadoEn?: Date,
  ) {}

  // ========= FACTORY ===========
  static create(props: {
    empresaId: number;
    nombre: string;
    slug: string;
    descripcion?: string | null;

    provider?: string;
    model?: string;

    systemPrompt: string;
    contextPrompt?: string | null;
    historyPrompt?: string | null;
    outputStyle?: string | null;

    maxCompletionTokens?: number;
    temperature?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    maxHistoryMessages?: number;

    status?: BotStatus;
  }): Bot {
    return new Bot(
      null, // id
      props.empresaId,

      props.nombre,
      props.slug,
      props.descripcion ?? null,

      props.provider ?? 'fireworks',
      props.model ?? 'accounts/fireworks/models/gpt-oss-120b',

      props.systemPrompt,
      props.contextPrompt ?? null,
      props.historyPrompt ?? null,
      props.outputStyle ?? null,

      props.maxCompletionTokens ?? 500,
      props.temperature ?? 0.7,
      props.topP ?? 0.9,
      props.frequencyPenalty ?? 0.2,
      props.presencePenalty ?? 0.0,
      props.maxHistoryMessages ?? 15,

      props.status ?? BotStatus.ACTIVE,

      undefined,
      undefined,
    );
  }
}
