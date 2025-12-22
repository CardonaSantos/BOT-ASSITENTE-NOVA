import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CrmService } from '../app/crm.service';
import { CreateCrmDto } from '../dto/create-crm.dto';
import { UpdateCrmDto } from '../dto/update-crm.dto';

@Controller('crm')
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Post('create-ticket')
  create(@Body() createCrmDto: CreateCrmDto) {
    return this.crmService.create(createCrmDto);
  }
}
