export class SearchDto {
  producto: string;
  categorias: Array<string>;
}

export class BotListarCatalogoDto {
  consulta?: string | null;
  limit?: number | null;
  incluirEjemplos?: boolean | null;
}
