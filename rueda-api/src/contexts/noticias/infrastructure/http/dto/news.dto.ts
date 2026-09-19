import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/**
 * Only the shape is checked here. The allowed types and publication states live
 * in the domain, which refuses them with the message the staff reads.
 */
export class SaveNewsDto {
  @IsString() @IsNotEmpty() @MaxLength(105) tituloNoticia!: string;
  @IsString() @IsNotEmpty() @MaxLength(500) contenidoNoticia!: string;

  @IsOptional() @IsString() @MaxLength(500) urlImagenNoticia?: string;
  @IsOptional() @IsString() @MaxLength(45) tipoNoticia?: string;
  @IsOptional() @IsString() @MaxLength(45) estadoPublicacion?: string;
}

export class ListNewsQueryDto {
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) eventId?: number;
}
