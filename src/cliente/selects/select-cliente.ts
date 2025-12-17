import { Prisma } from '@prisma/client';

export const selectedCliente = {
  id: true,
  creadoEn: true,
  actualizadoEn: true,
  nombre: true,
  empresa: true,
  telefono: true,
  uuid: true,
  crmUsuarioId: true,
  empresaId: true,
} satisfies Prisma.ClienteSelect;

export type selecteCliente = Prisma.ClienteGetPayload<{
  select: typeof selectedCliente;
}>;

export type selectedClientes = selecteCliente[];
