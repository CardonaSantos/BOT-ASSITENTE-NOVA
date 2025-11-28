import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CreateEmpresaDto } from '../dto/create-empresa.dto';
import { UpdateEmpresaDto } from '../dto/update-empresa.dto';
import { EmpresaService } from '../app/empresa.service';

@Controller('empresas')
export class EmpresaController {
  constructor(private readonly empresaService: EmpresaService) {}

  @Post()
  create(@Body() dto: CreateEmpresaDto) {
    return this.empresaService.create(dto);
  }

  @Get()
  findAll() {
    return this.empresaService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.empresaService.findOne(+id);
  }

  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.empresaService.findBySlug(slug);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEmpresaDto) {
    return this.empresaService.update(+id, dto);
  }
}
