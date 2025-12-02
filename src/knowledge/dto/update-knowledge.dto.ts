import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { KnowledgeDocumentType } from '@prisma/client';

export class UpdateKnowledgeDto {
  @IsOptional()
  @IsEnum(KnowledgeDocumentType)
  tipo?: KnowledgeDocumentType;

  @IsOptional()
  @IsString()
  @MinLength(2)
  titulo?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  origen?: string;

  @IsOptional()
  @IsString()
  idioma?: string;

  // Si quisieras permitir actualizar también el texto largo
  @IsOptional()
  @IsString()
  @MinLength(10)
  textoLargo?: string;

  @IsOptional()
  @IsInt()
  empresaId: number;
}
