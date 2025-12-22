import { Module } from '@nestjs/common';
import { CrmService } from './app/crm.service';
import { CrmController } from './presentation/crm.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  controllers: [CrmController],
  providers: [CrmService],
  exports: [CrmService],
})
export class CrmModule {}
