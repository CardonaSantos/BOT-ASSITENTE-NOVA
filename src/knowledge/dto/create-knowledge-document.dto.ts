// src/knowledge/dto/create-knowledge-document.dto.ts
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { KnowledgeDocumentType } from '@prisma/client';

export class CreateKnowledgeDocumentDto {
  @IsInt()
  empresaId: number;

  @IsEnum(KnowledgeDocumentType)
  tipo: KnowledgeDocumentType;

  @IsString()
  @MinLength(2)
  titulo: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  idioma?: string;

  @IsString()
  @MinLength(10)
  textoLargo: string;
}
