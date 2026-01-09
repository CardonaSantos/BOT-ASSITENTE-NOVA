import { Module } from '@nestjs/common';
import { PosFunctionsController } from './presentation/pos-functions.controller';
import { PosFunctionsService } from './app/pos-functions.service';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [HttpModule, ConfigModule],
  controllers: [PosFunctionsController],
  providers: [PosFunctionsService],
  exports: [PosFunctionsService],
})
export class PosFunctionsModule {}
