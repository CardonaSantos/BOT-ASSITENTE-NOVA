import { PartialType } from '@nestjs/mapped-types';
import { CreatePosFunctionDto } from './create-pos-function.dto';

export class UpdatePosFunctionDto extends PartialType(CreatePosFunctionDto) {}
