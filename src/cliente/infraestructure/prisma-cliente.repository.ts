// src/cliente/infrastructure/prisma-cliente.repository.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma-service/prisma-service.service';
import { ClienteRepository } from '../domain/cliente.repository';
import { Cliente } from '../entities/cliente.entity';
import { throwFatalError } from 'src/Utils/CommonFatalError';

@Injectable()
export class PrismaClienteRepository implements ClienteRepository {
  private readonly logger = new Logger(PrismaClienteRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  private toDomain(row: any): Cliente | null {
    if (!row) return null;

    return new Cliente(
      row.id,
      row.empresaId,
      row.nombre,
      row.telefono,
      row.uuid,
      row.crmUsuarioId,
      row.creadoEn,
      row.actualizadoEn,
    );
  }

  async create(c: Cliente): Promise<Cliente> {
    try {
      const row = await this.prisma.cliente.create({
        data: {
          empresaId: c.empresaId,
          nombre: c.nombre,
          telefono: c.telefono,
          uuid: c.uuid,
          crmUsuarioId: c.crmUsuarioId,
        },
      });

      return this.toDomain(row);
    } catch (error) {
      throwFatalError(
        error,
        this.logger,
        'Cliente - PrismaClienteRepository.create',
      );
    }
  }

  async update(id: number, data: Partial<Cliente>): Promise<Cliente> {
    try {
      const row = await this.prisma.cliente.update({
        where: { id },
        data: {
          empresaId: data.empresaId,
          nombre: data.nombre,
          telefono: data.telefono,
          uuid: data.uuid,
          crmUsuarioId: data.crmUsuarioId,
        },
      });

      return this.toDomain(row);
    } catch (error) {
      throwFatalError(
        error,
        this.logger,
        'Cliente - PrismaClienteRepository.update',
      );
    }
  }

  async findById(id: number): Promise<Cliente | null> {
    try {
      const row = await this.prisma.cliente.findUnique({
        where: { id },
      });

      return this.toDomain(row);
    } catch (error) {
      throwFatalError(
        error,
        this.logger,
        'Cliente - PrismaClienteRepository.findById',
      );
    }
  }

  async findByEmpresaAndTelefono(
    empresaId: number,
    telefono: string,
  ): Promise<Cliente | null> {
    try {
      const row = await this.prisma.cliente.findUnique({
        where: {
          empresaId_telefono: {
            empresaId,
            telefono,
          },
        },
      });

      return this.toDomain(row);
    } catch (error) {
      throwFatalError(
        error,
        this.logger,
        'Cliente - PrismaClienteRepository.findByEmpresaAndTelefono',
      );
    }
  }

  async upsertByEmpresaAndTelefono(
    empresaId: number,
    telefono: string,
    nombre?: string | null,
  ): Promise<Cliente> {
    try {
      const row = await this.prisma.cliente.upsert({
        where: {
          empresaId_telefono: {
            empresaId,
            telefono,
          },
        },
        update: {
          nombre: nombre ?? undefined,
        },
        create: {
          empresaId,
          telefono,
          nombre: nombre ?? null,
        },
      });

      return this.toDomain(row);
    } catch (error) {
      throwFatalError(
        error,
        this.logger,
        'Cliente - PrismaClienteRepository.upsertByEmpresaAndTelefono',
      );
    }
  }

  async findAllByEmpresa(empresaId: number): Promise<Cliente[]> {
    try {
      const rows = await this.prisma.cliente.findMany({
        where: { empresaId },
        orderBy: { creadoEn: 'asc' },
      });

      return rows.map((r) => this.toDomain(r)!);
    } catch (error) {
      throwFatalError(
        error,
        this.logger,
        'Cliente - PrismaClienteRepository.findAllByEmpresa',
      );
    }
  }
}
