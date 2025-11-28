import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateEmpresaDto {
  @IsString()
  @MinLength(2)
  nombre: string;

  @IsString()
  @MinLength(2)
  slug: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
