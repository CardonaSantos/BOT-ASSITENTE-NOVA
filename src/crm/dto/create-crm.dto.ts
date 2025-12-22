import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateCrmDto {
  @IsOptional()
  @IsInt()
  dpi?: number;

  @IsString()
  @IsOptional()
  descripcion: string;

  @IsString()
  @IsOptional()
  titulo: string;
}
