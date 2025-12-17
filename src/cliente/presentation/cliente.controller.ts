// src/cliente/presentation/cliente.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ClienteService } from '../app/cliente.service';
import { CreateClienteDto } from '../dto/create-cliente.dto';
import { UpdateClienteDto } from '../dto/update-cliente.dto';
import { FindClientesMessagesQuery } from '../dto/dto-pagination';

@Controller('cliente')
export class ClienteController {
  constructor(private readonly clienteService: ClienteService) {}

  @Post()
  create(@Body() dto: CreateClienteDto) {
    return this.clienteService.create(dto);
  }

  @Get('get-all')
  getAllClientes(@Query() q: FindClientesMessagesQuery) {
    return this.clienteService.getAllClientes(q);
  }

  @Get(':id')
  getCliente(@Param('id', ParseIntPipe) id: number) {
    return this.clienteService.findById(id);
  }

  @Get('empresa/:empresaId/telefono/:telefono')
  findByEmpresaAndTelefono(
    @Param('empresaId', ParseIntPipe) empresaId: string,
    @Param('telefono') telefono: string,
  ) {
    return this.clienteService.findByEmpresaAndTelefono(+empresaId, telefono);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: string, @Body() dto: UpdateClienteDto) {
    return this.clienteService.update(+id, dto);
  }
}
