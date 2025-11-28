export class Empresa {
  constructor(
    public readonly id: number | null,
    public nombre: string,
    public slug: string,
    public activo: boolean,
    public readonly creadoEn?: Date,
    public readonly actualizadoEn?: Date,
  ) {}

  static create(props: { nombre: string; slug: string }): Empresa {
    return new Empresa(null, props.nombre, props.slug, true);
  }
}
