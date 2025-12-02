// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de la base de datos del BOT...');

  // 1) Crear empresa base (la de Nova) para este servidor de bots
  const empresa = await prisma.empresa.create({
    data: {
      nombre: 'Nova Sistemas S.A.',
      slug: 'nova-sistemas',
      activo: true,
    },
  });

  console.log('✅ Empresa creada:', empresa);

  // 2) Crear bot por defecto para esa empresa
  const bot = await prisma.bot.create({
    data: {
      empresaId: empresa.id,
      nombre: 'Bot Nova Sistemas WhatsApp',
      descripcion:
        'Asistente de soporte y cobros para clientes de Nova Sistemas a través de WhatsApp.',

      // Modelo de Fireworks
      model: 'accounts/fireworks/models/gpt-oss-120b',

      // Prompt base (lo que hoy tienes hardcodeado en messages[0])
      systemPrompt: `
Eres el asistente de soporte al cliente y agente del CRM de ${empresa.nombre}.
Respondes siempre alegre, amable y creativo, pero muy claro y preciso.
No dibujes tablas, ya que responderás como si estuvieras enviando mensajes por WhatsApp.
Puedes usar textos que se conviertan a negrita por WhatsApp (por ejemplo *así*), 
pero fuera del texto plano, seccionado o emojis no debes pasar, 
ya que tu respuesta será siempre enviada por WhatsApp.
      `.trim(),

      // Parámetros de generación por defecto (los mismos que usas en el server ahora)
      temperature: 0.4,
      topP: 0.9,
      presencePenalty: 0.0,
      frequencyPenalty: 0.2,
      maxCompletionTokens: 500,
      slug: 'nova-sistemas-bot',

      status: 'ACTIVE',
    },
  });

  console.log('🤖 Bot creado:', bot);
}

main()
  .catch((error) => {
    console.error('❌ Error en el seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('🔌 Conexión cerrada.');
  });
