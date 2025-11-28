import { Module } from '@nestjs/common';
import { EmpresaController } from './presentation/empresa.controller';
import { PrismaModuleModule } from 'src/prisma/prisma-module/prisma-module.module';
import { EmpresaService } from './app/empresa.service';
import { EMPRESA_REPOSITORY } from './domain/empresa.repository';
import { PrismaEmpresaRepository } from './infraestructure/prisma-empresa.repository';

@Module({
  imports: [PrismaModuleModule],
  controllers: [EmpresaController],
  providers: [
    EmpresaService,
    {
      provide: EMPRESA_REPOSITORY,
      useClass: PrismaEmpresaRepository,
    },
  ],
  exports: [EmpresaService],
})
export class EmpresaModule {}
