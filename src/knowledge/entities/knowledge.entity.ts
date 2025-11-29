import { KnowledgeDocumentType } from '@prisma/client';

export class Knowledge {
  constructor(
    public readonly id: number | null,
    public readonly empresaId: number,

    public tipo: KnowledgeDocumentType,
    public externoId: number | null,

    public origen: string | null,
    public titulo: string,

    public descripcion?: string,

    public textoLargo?: string, // contenido para RAG

    public readonly creadoEn?: Date,
    public readonly actualizadoEn?: Date,
  ) {}

  //metodo creador
  static create(props: {
    empresaId: number;
    tipo: KnowledgeDocumentType;
    externoId: number | null;
    origen?: string | null;
    titulo: string;
    descripcion?: string;
    textoLargo: string; //  obligatorio para indexar
  }): Knowledge {
    return new Knowledge(
      null,
      props.empresaId,
      props.tipo,
      props.externoId,
      props.origen || null,
      props.titulo,
      props.descripcion,
      props.textoLargo,

      undefined, //create
      undefined, //updated
    );
  }
}
