export type InventarioEstado = 'CON_STOCK' | 'SIN_STOCK_PARA_PEDIDO';

export interface CatalogoProductoBot {
  id: number;
  nombre: string;
  codigoProducto?: string | null;
  precio: number;
  totalDisponible: number;
  cantidadDisponible: Record<string, number>;
  inventarioEstado: InventarioEstado;
}

export interface CatalogoGrupoBot {
  tipoResultado: 'categoria_catalogo';
  categoria: {
    id: number;
    nombre: string;
  };
  totalProductosRelacionados: number;
  totalConStock: number;
  totalParaPedido: number;
  ejemplos: CatalogoProductoBot[];
}

export type BotListarCatalogoResponse = CatalogoGrupoBot[];
