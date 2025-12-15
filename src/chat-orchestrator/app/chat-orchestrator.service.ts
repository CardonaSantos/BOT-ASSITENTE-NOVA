import { Injectable, Logger } from '@nestjs/common';
import { EmpresaService } from 'src/empresa/app/empresa.service';
import { ClienteService } from 'src/cliente/app/cliente.service';
import { ChatService } from 'src/chat/app/chat.service';
import { FireworksIaService } from 'src/fireworks-ia/app/fireworks-ia.service';
import { ChatChannel, ChatRole } from '@prisma/client';
import { KnowledgeService } from 'src/knowledge/app/knowledge.service';
import { extname } from 'path';
import { generarKeyWhatsapp } from 'src/Utils/enrutador-dospaces';

export interface HandleIncomingMessageParams {
  empresaSlug: string;
  empresaNombreFallback: string;
  telefono: string;
  texto: string;
  canal: ChatChannel;
  nombreClienteWhatsApp?: string | null;
}

@Injectable()
export class ChatOrchestratorService {
  private readonly logger = new Logger(ChatOrchestratorService.name);
  constructor(
    private readonly empresaService: EmpresaService,
    private readonly clienteService: ClienteService,
    private readonly chatService: ChatService,
    private readonly knowledgeService: KnowledgeService, // opcional, si lo usas
    private readonly fireworksIa: FireworksIaService, // opcional, si lo usas
  ) {}

  /**
   * Punto central:
   * - Asegura empresa
   * - Asegura cliente por teléfono
   * - Asegura sesión abierta
   * - Guarda mensaje del usuario
   * - Busca contexto y responde
   */
  async handleIncomingMessage(params: HandleIncomingMessageParams) {
    const {
      empresaSlug,
      empresaNombreFallback,
      telefono,
      texto,
      canal,
      nombreClienteWhatsApp,
    } = params;

    //  Empresa
    const empresa = await this.empresaService.ensureBySlug(
      empresaSlug,
      empresaNombreFallback,
    );

    //  Cliente
    let cliente = await this.clienteService.findByEmpresaAndTelefono(
      empresa.id,
      telefono,
    );

    if (!cliente) {
      const nombre =
        nombreClienteWhatsApp && nombreClienteWhatsApp.trim().length > 0
          ? nombreClienteWhatsApp.trim()
          : `Usuario ${telefono}`;

      cliente = await this.clienteService.create({
        empresaId: empresa.id,
        telefono,
        nombre,
      } as any);
    }

    //  Sesión
    const session = await this.chatService.ensureOpenSession({
      empresaId: empresa.id,
      clienteId: cliente.id,
      telefono,
      canal,
    });

    //  Guardar mensaje del usuario
    const userMessage = await this.chatService.addMessage({
      sessionId: session.id!,
      rol: ChatRole.USER,
      contenido: texto,
    });

    //  Historial
    const history = await this.chatService.getLastMessages(session.id!);

    const historyText = history
      .map((m) =>
        m.rol === ChatRole.USER
          ? `Usuario: ${m.contenido}`
          : `Bot: ${m.contenido}`,
      )
      .join('\n');

    //Buscar contexto en base de conocimiento
    const knChunks = await this.knowledgeService.search(empresa.id, texto, 7);

    const contextText = knChunks
      .map(
        (c, idx) =>
          `#${idx + 1} [distance=${c.distance?.toFixed(4) ?? 'N/A'}] (${c.tipo}) ${c.titulo}:\n${c.texto}`,
      )
      .join('\n\n---\n\n');

    this.logger.debug(
      `[RAG] Contexto generado (${knChunks.length} chunks):\n` +
        contextText.slice(0, 2000), // evita logs enormes
    );
    //  Pedir respuesta al modelo usando RAG
    const reply = await this.fireworksIa.replyWithContext({
      empresaNombre: empresa.nombre,
      context: contextText,
      historyText,
      question: texto,
    });

    // Guardar respuesta del bot
    const botMessage = await this.chatService.addMessage({
      sessionId: session.id!,
      rol: ChatRole.ASSISTANT,
      contenido: reply,
    });

    return {
      empresa,
      cliente,
      session,
      userMessage,
      botMessage,
      reply,
    };
  }
}

export async function procesarMediaWhatsapp(
  msg: any,
  ctx: {
    empresaId: number;
    clienteId: number;
    sessionId: number;
  },
) {
  // 1) Descargas el archivo desde Meta -> obtienes buffer + contentType + filename
  const { buffer, contentType, filename } = await this.meta.downloadMedia(
    msg.image.id,
  );
  // filename puede venir null, pero tú puedes inventarlo

  // 2) Sacas extensión
  const extension = extname(filename ?? '') || 'jpg'; // o derivarlo del contentType

  // 3) Construyes el key dinámico
  const key = generarKeyWhatsapp({
    empresaId: ctx.empresaId,
    clienteId: ctx.clienteId,
    sessionId: ctx.sessionId,
    wamid: msg.id, // message.id (wamid)
    tipo: 'image', // 'image'|'document'|'audio'...
    direction: 'in', // 'in' si lo recibes
    extension,
    timestampUnixSeconds: msg.timestamp ? Number(msg.timestamp) : undefined,
    basePrefix: 'crm',
  });

  const uploaded = await this.cloudStorage.uploadBuffer({
    buffer,
    contentType,
    key,
  });

  return uploaded.url;
}
