import { Cliente } from '../entities/cliente.entity';

// EMPRESA, ES LA ENTIDAD
export const CLIENTE_REPOSITORY = Symbol('CLIENTE_REPOSITORY');

export interface ClienteRepository {
  create(cliente: Cliente): Promise<Cliente>;
  update(id: number, data: Partial<Cliente>): Promise<Cliente>;
  findById(id: number): Promise<Cliente | null>;
  findByEmpresaAndTelefono(
    empresaId: number,
    telefono: string,
  ): Promise<Cliente | null>;
  upsertByEmpresaAndTelefono(
    empresaId: number,
    telefono: string,
    nombre?: string | null,
  ): Promise<Cliente>;
  findAllByEmpresa(empresaId: number): Promise<Cliente[]>;
}
