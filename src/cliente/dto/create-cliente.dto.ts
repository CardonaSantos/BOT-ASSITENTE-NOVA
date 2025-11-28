// src/cliente/dto/create-cliente.dto.ts
import { IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateClienteDto {
  @IsInt()
  empresaId: number;

  @IsOptional()
  @IsString()
  @MinLength(2)
  nombre?: string;

  @IsString()
  telefono: string; // ID lógico principal

  @IsOptional()
  @IsString()
  uuid?: string; // UUID oficial del CRM (si aplica)

  @IsOptional()
  @IsInt()
  crmUsuarioId?: number; // id del usuario/cliente en tu CRM, si lo usas
}
