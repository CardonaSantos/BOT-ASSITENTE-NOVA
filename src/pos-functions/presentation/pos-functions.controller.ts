import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CreatePosFunctionDto } from '../dto/create-pos-function.dto';
import { UpdatePosFunctionDto } from '../dto/update-pos-function.dto';
import { PosFunctionsService } from '../app/pos-functions.service';

@Controller('pos-functions')
export class PosFunctionsController {
  constructor(private readonly posFunctionsService: PosFunctionsService) {}
}
