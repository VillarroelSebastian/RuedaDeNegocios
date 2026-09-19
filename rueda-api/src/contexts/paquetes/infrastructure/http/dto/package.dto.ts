import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Only the shape is checked here. The rules that make a package coherent — the
 * cap never below the credentials it includes, the table level, the modality —
 * live in the domain, which refuses them with the message the staff reads.
 */
export class SavePackageDto {
  @IsString() @IsNotEmpty() @MaxLength(105) nombre!: string;

  @IsNumber() @Min(0) @Type(() => Number) costo!: number;
  @IsInt() @Min(1) @Type(() => Number) credencialesIncluidas!: number;

  @IsOptional() @IsInt() @Min(1) @Type(() => Number) maxParticipantes?: number;
  @IsOptional() @IsString() @MaxLength(205) objetivo?: string;
  @IsOptional() @IsString() @MaxLength(505) descripcion?: string;
  @IsOptional() @IsString() @MaxLength(2000) contenido?: string;
  @IsOptional() @IsString() @MaxLength(20) nivelMesa?: string;
  @IsOptional() @IsString() @MaxLength(75) tipoParticipacion?: string;
  @IsOptional() @IsBoolean() apareceEnCatalogo?: boolean;
  @IsOptional() @IsBoolean() logoEnWeb?: boolean;
  @IsOptional() @IsBoolean() destacadoEnListados?: boolean;
  @IsOptional() @IsString() @MaxLength(505) urlQR?: string;
  @IsOptional() @IsInt() @Min(0) @Type(() => Number) orden?: number;

  /** Defaults to the running event. */
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) eventId?: number;
}

export class ListPackagesQueryDto {
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) eventId?: number;
}
