import { Inject, Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { OPENAI_CLIENT } from '../infraestructure/open-ia.client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma-service/prisma-service.service';
import { CrmService } from 'src/crm/app/crm.service';
import { PosFunctionsService } from 'src/pos-functions/app/pos-functions.service';
import { BotListarCatalogoDto } from 'src/pos-functions/dto/pos-functions.dto';

export const OPENAI_TOOLS: OpenAI.Responses.Tool[] = [
  {
    type: 'function',
    name: 'crear_ticket_soporte',
    description: 'Crea un ticket de soporte técnico en el CRM',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        titulo: {
          type: 'string',
          description: 'Título corto del problema',
        },
        descripcion: {
          type: 'string',
          description: 'Descripción detallada del problema',
        },
      },
      required: ['titulo', 'descripcion'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'buscar_producto_en_pos',
    description:
      'Busca productos disponibles en el POS/ERP por intención del cliente. Úsala cuando el cliente pregunte por existencia, precios, inventario, productos, marcas, modelos o alternativas disponibles.',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        producto: {
          type: ['string', 'null'],
          description:
            'Texto principal que pidió el cliente. Puede ser marca, modelo, familia o tipo de producto. Ejemplos: "iphone", "samsung", "teléfonos", "laptop hp", "protector". Usa null si el cliente pregunta algo general.',
        },
        categorias: {
          type: 'array',
          description:
            'Términos relacionados para ampliar la búsqueda. Incluye sinónimos, tipo de producto, marcas mencionadas por el cliente y variantes probables. Ejemplo: ["telefono", "celular", "smartphone", "iphone", "samsung", "xiaomi"].',
          items: {
            type: 'string',
          },
          maxItems: 25,
        },
        limit: {
          type: ['integer', 'null'],
          description:
            'Cantidad máxima de productos a retornar. Usa 30 por defecto. Usa null si no se especifica.',
        },
      },
      required: ['producto', 'categorias', 'limit'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'listar_catalogo_pos',
    description:
      'Lista categorías/familias disponibles del POS/ERP con conteo de productos y ejemplos. Úsala cuando el cliente pregunte qué venden, qué productos manejan, qué categorías tienen, o cuando una búsqueda de productos no encuentre buenos resultados. Tambien puedes usarla para cuando le quieras ofrecer alternativas de productos al cliente o si le podría interesar algo más a el mismo',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        consulta: {
          type: ['string', 'null'],
          description:
            'Texto opcional para filtrar categorías o productos. Ejemplos: "telefonos", "accesorios", "computadoras". Usa null para listar categorías generales. Lista las mas relevantes o que le podrian interesar al usuario',
        },
        limit: {
          type: ['integer', 'null'],
          description:
            'Máximo de categorías a retornar. Usa 20 por defecto. Usa null si no se especifica.',
        },
        incluirEjemplos: {
          type: ['boolean', 'null'],
          description:
            'Si debe incluir algunos productos de ejemplo por categoría. Usa true cuando el cliente pregunta qué hay disponible.',
        },
      },
      required: ['consulta', 'limit', 'incluirEjemplos'],
      additionalProperties: false,
    },
  },
];

type ReplyParams = {
  empresaNombre: string;
  question: string;
  manual: string;

  imageUrls?: string[];
  audioUrls?: string[];
  videoUrls?: string[];
  documentUrls?: string[];

  audioTranscripts?: string[];
  videoTranscripts?: string[];
  documentTexts?: string[];
  videoFrameUrls?: string[];

  previousResponseId?: string | null;
};

type ReplyStreamParams = ReplyParams & {
  onToken?: (token: string) => void;
};

export type ReplyResult = {
  reply: string;
  responseId: string | null;
};

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

  private buildInstructions(
    empresaNombre: string,
    manual: string,
    systemPrompt?: string | null,
  ) {
    return [
      manual?.trim(),
      `ERES EL ASISTENTE DE: ${empresaNombre}`,
      systemPrompt?.trim(),
    ]
      .filter(Boolean)
      .join('\n');
  }

  private buildMediaContext(params: {
    audioUrls?: string[];
    videoUrls?: string[];
    documentUrls?: string[];

    audioTranscripts?: string[];
    videoTranscripts?: string[];
    documentTexts?: string[];
  }) {
    const parts: string[] = [];

    if (params.audioTranscripts?.length) {
      parts.push(
        [
          'Audios transcritos:',
          ...params.audioTranscripts.map((text, index) => {
            return `${index + 1}. ${text}`;
          }),
        ].join('\n'),
      );
    } else if (params.audioUrls?.length) {
      parts.push(
        [
          'Audios recibidos, pero sin transcripción disponible:',
          ...params.audioUrls.map((url, index) => `${index + 1}. ${url}`),
          'No asumas el contenido del audio. Pide que escriban el mensaje si hace falta.',
        ].join('\n'),
      );
    }

    if (params.videoTranscripts?.length) {
      parts.push(
        [
          'Videos con audio transcrito:',
          ...params.videoTranscripts.map((text, index) => {
            return `${index + 1}. ${text}`;
          }),
        ].join('\n'),
      );
    } else if (params.videoUrls?.length) {
      parts.push(
        [
          'Videos recibidos, pero sin análisis visual disponible:',
          ...params.videoUrls.map((url, index) => `${index + 1}. ${url}`),
          'No asumas el contenido del video. Si hace falta diagnóstico visual, pide una foto clara o una descripción breve.',
        ].join('\n'),
      );
    }

    if (params.documentTexts?.length) {
      parts.push(
        [
          'Texto extraído de documentos:',
          ...params.documentTexts.map((text, index) => {
            return `${index + 1}. ${text}`;
          }),
        ].join('\n\n'),
      );
    } else if (params.documentUrls?.length) {
      parts.push(
        [
          'Documentos recibidos, pero sin extracción de texto disponible:',
          ...params.documentUrls.map((url, index) => `${index + 1}. ${url}`),
          'No asumas el contenido del documento. Pide reenviarlo como texto o espera revisión interna si hace falta.',
        ].join('\n'),
      );
    }

    return parts.join('\n\n');
  }

  private buildUserInput(
    question: string,
    imageUrls?: string[],
  ): OpenAI.Responses.ResponseInput {
    const content: any[] = [];

    if (question?.trim()) {
      content.push({
        type: 'input_text',
        text: question.trim(),
      });
    } else {
      content.push({
        type: 'input_text',
        text: 'Hola',
      });
    }

    for (const url of imageUrls ?? []) {
      content.push({
        type: 'input_image',
        image_url: url,
        detail: 'auto',
      });
    }

    return [
      {
        role: 'user',
        content,
      },
    ];
  }

  private buildTools(vectorStoreId: string): OpenAI.Responses.Tool[] {
    const tools: OpenAI.Responses.Tool[] = [];

    if (vectorStoreId) {
      tools.push({
        type: 'file_search',
        vector_store_ids: [vectorStoreId],
      });
    }

    return [...tools, ...OPENAI_TOOLS];
  }

  private buildResponseRequest(params: {
    model: string;
    instructions: string;
    vectorStoreId: string;
    maxTokens: number;
    question: string;
    imageUrls?: string[];
    previousResponseId?: string | null;
  }): OpenAI.Responses.ResponseCreateParamsNonStreaming {
    const request: OpenAI.Responses.ResponseCreateParamsNonStreaming = {
      model: params.model,
      instructions: params.instructions,
      tools: this.buildTools(params.vectorStoreId),
      tool_choice: 'auto',
      store: true,
      max_output_tokens: params.maxTokens,
      input: this.buildUserInput(params.question, params.imageUrls),
    };

    if (params.previousResponseId) {
      request.previous_response_id = params.previousResponseId;
    }

    return request;
  }

  private safeParseToolArgs(toolCall: any) {
    try {
      return JSON.parse(toolCall.arguments ?? '{}');
    } catch (err) {
      this.logger.error(
        `Error parseando argumentos de tool ${toolCall.name}`,
        err,
      );

      return {};
    }
  }

  private async handleCrearTicketTool(toolCall: any, args: any) {
    try {
      const ticket = await this.crmService.create({
        titulo: args.titulo,
        descripcion: args.descripcion,
      });

      return {
        type: 'function_call_output',
        call_id: toolCall.call_id,
        output: JSON.stringify({
          status: 'success',
          ticket_id: ticket.id,
        }),
      };
    } catch (err) {
      this.logger.error('Error creando ticket CRM', err);

      return {
        type: 'function_call_output',
        call_id: toolCall.call_id,
        output: JSON.stringify({
          status: 'error',
          message: 'No se pudo crear el ticket.',
        }),
      };
    }
  }

  private async handleBuscarProductoTool(toolCall: any, args: any) {
    const dto = {
      producto:
        typeof args.producto === 'string' && args.producto.trim().length > 0
          ? args.producto.trim()
          : null,
      categorias: Array.isArray(args.categorias) ? args.categorias : [],
      limit:
        Number.isFinite(Number(args.limit)) && Number(args.limit) > 0
          ? Math.trunc(Number(args.limit))
          : 30,
    };

    let productos: any[] = [];

    try {
      const raw = await this.pos_erp_Service.search(dto);

      if (Array.isArray(raw)) {
        productos = raw;
      }

      this.logger.log(
        `[OPENAI_TOOL_RESULT] buscar_producto_en_pos productos=${productos.length}\nPREVIEW:\n${JSON.stringify(
          productos.slice(0, 10),
          null,
          2,
        )}`,
      );
    } catch (err) {
      this.logger.error('[OPENAI_TOOL_ERROR] Error llamando POS ERP', err);
    }

    return {
      type: 'function_call_output',
      call_id: toolCall.call_id,
      output: JSON.stringify({
        ok: true,
        tipoResultado: 'busqueda_producto_pos',
        producto: dto.producto,
        categorias: dto.categorias,
        total: productos.length,
        productos,
      }),
    };
  }

  private async handleListarCatalogoTool(toolCall: any, args: any) {
    const dto: BotListarCatalogoDto = {
      consulta: typeof args.consulta === 'string' ? args.consulta : '',
      incluirEjemplos:
        typeof args.incluirEjemplos === 'boolean' ? args.incluirEjemplos : true,
    };

    const parsedLimit = Number(args.limit);

    if (Number.isFinite(parsedLimit) && parsedLimit > 0) {
      dto.limit = Math.trunc(parsedLimit);
    }

    let toolPayload: any = {
      ok: false,
      tipoResultado: 'catalogo_pos',
      consulta: dto.consulta,
      totalGrupos: 0,
      grupos: [],
      mensajeInterno:
        'No se pudo consultar el catálogo POS. No asumir que no hay productos.',
    };

    try {
      const raw = await this.pos_erp_Service.listar_catalogo_pos(dto);

      const grupos = Array.isArray(raw) ? raw : [];

      toolPayload = {
        ok: true,
        tipoResultado: 'catalogo_pos',
        consulta: dto.consulta,
        incluirEjemplos: dto.incluirEjemplos,
        totalGrupos: grupos.length,
        grupos,
        reglasInventario: {
          CON_STOCK: 'Producto con existencia disponible para venta inmediata.',
          SIN_STOCK_PARA_PEDIDO:
            'Producto sin existencia actual, pero puede mencionarse como opción para pedido o apartado.',
        },
      };

      this.logger.log(
        `[OPENAI_TOOL_RESULT] listar_catalogo_pos grupos=${grupos.length}\nPREVIEW:\n${JSON.stringify(
          grupos.slice(0, 10).map((g) => ({
            categoria: g?.categoria?.nombre ?? null,
            totalProductosRelacionados: g?.totalProductosRelacionados ?? null,
            totalConStock: g?.totalConStock ?? null,
            totalParaPedido: g?.totalParaPedido ?? null,
            ejemplos: Array.isArray(g?.ejemplos)
              ? g.ejemplos.slice(0, 5).map((p) => ({
                  id: p.id,
                  nombre: p.nombre,
                  precio: p.precio,
                  totalDisponible: p.totalDisponible,
                  inventarioEstado: p.inventarioEstado,
                }))
              : [],
          })),
          null,
          2,
        )}`,
      );
    } catch (err) {
      this.logger.error(
        '[OPENAI_TOOL_ERROR] Error llamando listar_catalogo_pos',
        err,
      );
    }

    return {
      type: 'function_call_output',
      call_id: toolCall.call_id,
      output: JSON.stringify(toolPayload),
    };
  }

  private async buildToolOutputs(functionCalls: any[]) {
    const toolOutputs: any[] = [];

    for (const toolCall of functionCalls) {
      const args = this.safeParseToolArgs(toolCall);

      if (toolCall.name === 'crear_ticket_soporte') {
        toolOutputs.push(await this.handleCrearTicketTool(toolCall, args));
        continue;
      }

      if (toolCall.name === 'buscar_producto_en_pos') {
        toolOutputs.push(await this.handleBuscarProductoTool(toolCall, args));
        continue;
      }

      if (toolCall.name === 'listar_catalogo_pos') {
        toolOutputs.push(await this.handleListarCatalogoTool(toolCall, args));
        continue;
      }

      toolOutputs.push({
        type: 'function_call_output',
        call_id: toolCall.call_id,
        output: JSON.stringify({
          status: 'error',
          message: `Tool no soportada: ${toolCall.name}`,
        }),
      });
    }

    return toolOutputs;
  }

  private async runResponseLoop(params: {
    baseRequest: OpenAI.Responses.ResponseCreateParamsNonStreaming;
    model: string;
    instructions: string;
    vectorStoreId: string;
    maxTokens: number;
  }): Promise<ReplyResult> {
    let response = await this.openai.responses.create(params.baseRequest);

    this.logger.log(`First Response es:\n${JSON.stringify(response, null, 2)}`);

    for (let depth = 0; depth < 3; depth++) {
      const functionCalls = (response.output ?? []).filter(
        (item: any) => item.type === 'function_call',
      );

      if (!functionCalls.length) {
        return {
          reply: response.output_text ?? '',
          responseId: response.id ?? null,
        };
      }

      const toolOutputs = await this.buildToolOutputs(functionCalls as any[]);

      response = await this.openai.responses.create({
        model: params.model,
        instructions: params.instructions,
        input: toolOutputs,
        previous_response_id: response.id,
        tools: this.buildTools(params.vectorStoreId),
        tool_choice: 'auto',
        store: true,
        max_output_tokens: params.maxTokens,
      });

      this.logger.log(
        `Response después de tools depth=${depth + 1}:\n${JSON.stringify(
          response,
          null,
          2,
        )}`,
      );
    }

    return {
      reply: 'No pude completar la respuesta en este momento.',
      responseId: null,
    };
  }

  /**
   * RESPONDER CON EL CONTEXTO PRINCIPAL - PARA PRODUCCIÓN
   * @param params
   * @returns
   */
  async replyWithContext(params: ReplyParams): Promise<ReplyResult> {
    const {
      empresaNombre,
      imageUrls,
      videoFrameUrls,
      question,
      manual,
      previousResponseId,
    } = params;

    const VECTOR_STORE_ID = this.config.get<string>('VECTOR_STORE_ID') ?? '';

    this.logger.log(
      `PARAMETROS en el builder :\n${JSON.stringify(params, null, 2)}`,
    );

    const botParams = await this.prisma.bot.findUnique({
      where: { id: 1 },
      select: {
        systemPrompt: true,
        temperature: true,
        maxCompletionTokens: true,
        topP: true,
      },
    });

    if (!botParams) {
      this.logger.error('Configuración del bot no encontrada en BD');

      return {
        reply: 'Configuración del asistente no disponible en este momento.',
        responseId: null,
      };
    }

    const model = this.config.get<string>('OPENAI_MODEL') ?? 'gpt-5.4-mini';
    const maxTokens = botParams.maxCompletionTokens ?? 1200;

    const instructions = this.buildInstructions(
      empresaNombre,
      manual,
      botParams.systemPrompt,
    );

    const mediaContext = this.buildMediaContext({
      audioUrls: params.audioUrls,
      videoUrls: params.videoUrls,
      documentUrls: params.documentUrls,

      audioTranscripts: params.audioTranscripts,
      videoTranscripts: params.videoTranscripts,
      documentTexts: params.documentTexts,
    });

    const questionWithMedia = [question, mediaContext]
      .filter((part) => part && part.trim().length > 0)
      .join('\n\n');

    const safeImageUrls = [...(imageUrls ?? []), ...(videoFrameUrls ?? [])];

    const baseRequest = this.buildResponseRequest({
      model,
      instructions,
      vectorStoreId: VECTOR_STORE_ID,
      maxTokens,
      question: questionWithMedia,
      imageUrls: safeImageUrls,
      previousResponseId,
    });

    try {
      return await this.runResponseLoop({
        baseRequest,
        model,
        instructions,
        vectorStoreId: VECTOR_STORE_ID,
        maxTokens,
      });
    } catch (error) {
      this.logger.error('Error general OpenAiIaService', error);

      if (error instanceof OpenAI.APIError) {
        this.logger.error(`OpenAI APIError: ${JSON.stringify(error.error)}`);
      }

      return {
        reply: 'Lo siento, tuve un error interno procesando tu solicitud.',
        responseId: null,
      };
    }
  }

  async replyWithContextStreamed(
    params: ReplyStreamParams,
  ): Promise<ReplyResult> {
    const {
      empresaNombre,
      imageUrls,
      videoFrameUrls,
      question,
      manual,
      previousResponseId,
      onToken,
    } = params;

    const VECTOR_STORE_ID = this.config.get<string>('VECTOR_STORE_ID') ?? '';

    const botParams = await this.prisma.bot.findUnique({
      where: { id: 1 },
      select: {
        systemPrompt: true,
        temperature: true,
        maxCompletionTokens: true,
        topP: true,
      },
    });

    if (!botParams) {
      return {
        reply: 'Configuración del asistente no disponible en este momento.',
        responseId: null,
      };
    }

    const model = this.config.get<string>('OPENAI_MODEL') ?? 'gpt-5.4-mini';
    const maxTokens = botParams.maxCompletionTokens ?? 1200;

    const instructions = this.buildInstructions(
      empresaNombre,
      manual,
      botParams.systemPrompt,
    );

    const mediaContext = this.buildMediaContext({
      audioUrls: params.audioUrls,
      videoUrls: params.videoUrls,
      documentUrls: params.documentUrls,
      audioTranscripts: params.audioTranscripts,
      videoTranscripts: params.videoTranscripts,
      documentTexts: params.documentTexts,
    });

    const questionWithMedia = [question, mediaContext]
      .filter((part) => part && part.trim().length > 0)
      .join('\n\n');

    const safeImageUrls = [...(imageUrls ?? []), ...(videoFrameUrls ?? [])];

    const request = this.buildResponseRequest({
      model,
      instructions,
      vectorStoreId: VECTOR_STORE_ID,
      maxTokens,
      question: questionWithMedia,
      imageUrls: safeImageUrls,
      previousResponseId,
    });

    const stream = await this.openai.responses.create({
      ...request,
      stream: true,
    });

    let fullText = '';
    let responseId: string | null = null;

    for await (const event of stream) {
      if (event.type === 'response.created') {
        responseId = event.response.id;
      }

      if (event.type === 'response.output_text.delta') {
        fullText += event.delta;
        onToken?.(event.delta);
      }

      if (event.type === 'response.completed') {
        responseId = event.response.id;
      }

      // if (event.type === 'response.error') {
      //   this.logger.error(`OpenAI stream error: ${JSON.stringify(event)}`);
      // }
    }

    return {
      reply:
        fullText.trim() || 'No pude generar una respuesta en este momento.',
      responseId,
    };
  }
}
