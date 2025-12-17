type PrismaClienteLike = {
  id: number;
  empresaId: number;
  nombre: string | null;
  telefono: string;
  uuid: string | null;
  crmUsuarioId: number | null;
  creadoEn?: Date | null;
  actualizadoEn?: Date | null;
};

export class Cliente {
  constructor(
    public readonly id: number | null,
    public readonly empresaId: number,

    public nombre: string | null,
    public telefono: string,

    public uuid: string | null,
    public crmUsuarioId: number | null,

    public readonly creadoEn?: Date,
    public readonly actualizadoEn?: Date,
  ) {}

  static create(props: {
    empresaId: number;
    nombre?: string | null;
    telefono: string;
    uuid?: string | null;
    crmUsuarioId?: number | null;
  }): Cliente {
    return new Cliente(
      null,
      props.empresaId,
      props.nombre ?? null,
      props.telefono,
      props.uuid ?? null,
      props.crmUsuarioId ?? null,
    );
  }

  static fromPrisma(row: PrismaClienteLike): Cliente {
    return new Cliente(
      row.id,
      row.empresaId,
      row.nombre ?? null,
      row.telefono,
      row.uuid ?? null,
      row.crmUsuarioId ?? undefined,
      row.actualizadoEn ?? undefined,
    );
  }
}
