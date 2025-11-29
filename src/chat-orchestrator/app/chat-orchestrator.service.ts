import { Injectable, Logger } from '@nestjs/common';
import { EmpresaService } from 'src/empresa/app/empresa.service';
import { ClienteService } from 'src/cliente/app/cliente.service';
import { ChatService } from 'src/chat/app/chat.service';
import { FireworksIaService } from 'src/fireworks-ia/app/fireworks-ia.service';
import { ChatChannel, ChatRole } from '@prisma/client';
import { KnowledgeService } from 'src/knowledge/app/knowledge.service';

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

    // 1. Empresa
    const empresa = await this.empresaService.ensureBySlug(
      empresaSlug,
      empresaNombreFallback,
    );

    // 2. Cliente
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

    // 3. Sesión
    const session = await this.chatService.ensureOpenSession({
      empresaId: empresa.id,
      clienteId: cliente.id,
      telefono,
      canal,
    });

    // 4. Guardar mensaje del usuario
    const userMessage = await this.chatService.addMessage({
      sessionId: session.id!,
      rol: ChatRole.USER,
      contenido: texto,
    });

    // 5. Historial
    const history = await this.chatService.getLastMessages(session.id!, 10);

    const historyText = history
      .map((m) =>
        m.rol === ChatRole.USER
          ? `Usuario: ${m.contenido}`
          : `Bot: ${m.contenido}`,
      )
      .join('\n');

    // 6. Buscar contexto en base de conocimiento
    const knChunks = await this.knowledgeService.search(empresa.id, texto, 5);

    const contextText = knChunks
      .map((c) => `(${c.tipo}) ${c.titulo}:\n${c.texto}`)
      .join('\n\n---\n\n');

    // 7. Pedir respuesta al modelo usando RAG
    const reply = await this.fireworksIa.replyWithContext({
      empresaNombre: empresa.nombre,
      context: contextText,
      historyText,
      question: texto,
    });

    // 8. Guardar respuesta del bot
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
