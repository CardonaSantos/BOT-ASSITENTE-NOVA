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
}
