import { ChatFlowIntent, ChatFlowStep } from '@prisma/client';

interface HandleFlowSupportParams {
  session: any;
  texto: string;
  telefono: string;
  chatService: any;
  whatsappApi: any;
}

export async function handleFlowSupport({
  session,
  texto,
  telefono,
  chatService,
  whatsappApi,
}: HandleFlowSupportParams): Promise<boolean> {
  const text = texto.toLowerCase().trim();
  const ctx = session.flowContext ?? {};

  // =========================
  // IDENTIFICACIÓN
  // =========================
  if (session.flowStep === ChatFlowStep.IDENTIFICACION) {
    if (/fibra|fibra óptica/i.test(text)) {
      ctx.serviceType = 'FIBRA';

      await chatService.updateFlow(session.id, {
        flowStep: ChatFlowStep.DIAGNOSTICO,
        flowContext: ctx,
      });

      await whatsappApi.sendText(
        telefono,
        'Perfecto 👍\n¿Tu equipo de internet tiene luces encendidas en este momento?',
      );
      return true;
    }

    if (/antena/i.test(text)) {
      ctx.serviceType = 'ANTENA';

      await chatService.updateFlow(session.id, {
        flowStep: ChatFlowStep.DIAGNOSTICO,
        flowContext: ctx,
      });

      await whatsappApi.sendText(
        telefono,
        'Gracias 👍\nUn momento por favor, te comunicaré con un asesor.',
      );
      return true;
    }

    await whatsappApi.sendText(
      telefono,
      'Para continuar, dime si tu servicio es por *fibra óptica* o por *antena*.',
    );
    return true;
  }

  // =========================
  // DIAGNÓSTICO
  // =========================
  if (session.flowStep === ChatFlowStep.DIAGNOSTICO) {
    if (/no|ninguna|apag/i.test(text)) {
      ctx.luces = 'APAGADAS';

      await chatService.updateFlow(session.id, {
        flowStep: ChatFlowStep.ACCION,
        flowContext: ctx,
      });

      await whatsappApi.sendText(
        telefono,
        'Gracias por confirmar.\nEs necesario que un técnico revise el equipo.\n\nPor favor envíame tu *nombre completo* para crear el ticket.',
      );
      return true;
    }

    if (/si|sí|encend/i.test(text)) {
      ctx.luces = 'ENCENDIDAS';

      await chatService.updateFlow(session.id, {
        flowStep: ChatFlowStep.CONFIRMACION,
        flowContext: ctx,
      });

      await whatsappApi.sendText(
        telefono,
        'Perfecto 👍\n¿Alguna luz está roja o parpadeando en rojo?',
      );
      return true;
    }

    await whatsappApi.sendText(
      telefono,
      'Solo dime si las luces están *encendidas* o *apagadas* 🙂',
    );
    return true;
  }

  // =========================
  // CONFIRMACIÓN
  // =========================
  if (session.flowStep === ChatFlowStep.CONFIRMACION) {
    if (/roja|rojo/i.test(text)) {
      ctx.luzRoja = true;

      await chatService.updateFlow(session.id, {
        flowStep: ChatFlowStep.ACCION,
        flowContext: ctx,
      });

      await whatsappApi.sendText(
        telefono,
        'Gracias por la información.\nNecesitamos escalar este caso.\n\nPor favor envíame tu *nombre completo* para crear el ticket.',
      );
      return true;
    }

    if (/no/i.test(text)) {
      await whatsappApi.sendText(
        telefono,
        'Entendido 👍\nUn momento por favor, te comunicaré con soporte.',
      );
      return true;
    }

    await whatsappApi.sendText(
      telefono,
      '¿Alguna luz está roja? Responde *sí* o *no*.',
    );
    return true;
  }

  // =========================
  // ACCIÓN (crear ticket luego)
  // =========================
  if (session.flowStep === ChatFlowStep.ACCION) {
    // aquí luego conectas CRM
    await whatsappApi.sendText(
      telefono,
      'Gracias 🙌\nUn asesor se comunicará contigo lo antes posible.',
    );

    await chatService.updateFlow(session.id, {
      flowStep: ChatFlowStep.CIERRE,
      ticketCreado: true,
    });

    return true;
  }

  return false;
}
