// src/cliente/presentation/cliente.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ClienteService } from '../app/cliente.service';
import { CreateClienteDto } from '../dto/create-cliente.dto';
import { UpdateClienteDto } from '../dto/update-cliente.dto';

@Controller('clientes')
export class ClienteController {
  constructor(private readonly clienteService: ClienteService) {}

  @Post()
  create(@Body() dto: CreateClienteDto) {
    return this.clienteService.create(dto);
  }

  // opcional: listar clientes de una empresa
  @Get()
  findAllByEmpresa(@Query('empresaId') empresaId?: string) {
    if (!empresaId) {
      // si quieres, aquí podrías lanzar error o devolver vacío;
      // yo asumo que siempre lo mandas
      return [];
    }

    return this.clienteService.findAllByEmpresa(+empresaId);
  }

  @Get('empresa/:empresaId/telefono/:telefono')
  findByEmpresaAndTelefono(
    @Param('empresaId') empresaId: string,
    @Param('telefono') telefono: string,
  ) {
    return this.clienteService.findByEmpresaAndTelefono(+empresaId, telefono);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateClienteDto) {
    return this.clienteService.update(+id, dto);
  }
}
