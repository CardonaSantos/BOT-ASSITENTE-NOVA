import { Inject, Injectable } from '@nestjs/common';
import { CreateClienteDto } from '../dto/create-cliente.dto';
import { UpdateClienteDto } from '../dto/update-cliente.dto';
import {
  CLIENTE_REPOSITORY,
  ClienteRepository,
} from '../domain/cliente.repository';
import { Cliente } from '../entities/cliente.entity';

@Injectable()
export class ClienteService {
  constructor(
    @Inject(CLIENTE_REPOSITORY)
    private readonly repo: ClienteRepository,
  ) {}

  async create(dto: CreateClienteDto): Promise<Cliente> {
    const cliente = Cliente.create({
      empresaId: dto.empresaId,
      nombre: dto.nombre ?? null,
      telefono: dto.telefono,
      uuid: dto.uuid ?? null,
      crmUsuarioId: dto.crmUsuarioId ?? null,
    });
    return this.repo.create(cliente);
  }

  async update(id: number, dto: UpdateClienteDto): Promise<Cliente> {
    return this.repo.update(id, dto);
  }

  async findByEmpresaAndTelefono(
    empresaId: number,
    telefono: string,
  ): Promise<Cliente | null> {
    return this.repo.findByEmpresaAndTelefono(empresaId, telefono);
  }

  async ensureByEmpresaAndTelefono(
    empresaId: number,
    telefono: string,
    nombre?: string | null,
  ): Promise<Cliente> {
    return this.repo.upsertByEmpresaAndTelefono(empresaId, telefono, nombre);
  }

  async findAllByEmpresa(empresaId: number): Promise<Cliente[]> {
    return this.repo.findAllByEmpresa(empresaId);
  }
}
