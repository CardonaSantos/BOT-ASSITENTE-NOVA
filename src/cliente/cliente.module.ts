import { Module } from '@nestjs/common';
import { ClienteService } from './app/cliente.service';
import { PrismaModuleModule } from 'src/prisma/prisma-module/prisma-module.module';
import { ClienteController } from './presentation/cliente.controller';
import { CLIENTE_REPOSITORY } from './domain/cliente.repository';
import { PrismaClienteRepository } from './infraestructure/prisma-cliente.repository';

@Module({
  imports: [PrismaModuleModule],
  controllers: [ClienteController],
  providers: [
    ClienteService,
    {
      provide: CLIENTE_REPOSITORY,
      useClass: PrismaClienteRepository,
    },
  ],
  exports: [ClienteService],
})
export class ClienteModule {}
