import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Shape only. The scheduling and logistics rules live in the domain services,
 * which is why dates arrive as strings and are parsed as Bolivian wall-clock
 * time there rather than by `class-transformer`.
 */
export class SaveEventDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del evento es obligatorio.' })
  @MaxLength(205)
  nombre!: string;

  @IsOptional() @IsString() @MaxLength(45) edicion?: string;
  @IsOptional() @IsString() @MaxLength(505) descripcion?: string;

  @IsString() @IsNotEmpty({ message: 'La fecha de inicio es obligatoria.' }) fechaInicioEvento!: string;
  @IsString() @IsNotEmpty({ message: 'La fecha de fin es obligatoria.' }) fechaFinEvento!: string;
  @IsOptional() @IsString() fechaInicioSolicitudes?: string;
  @IsOptional() @IsString() fechaFinSolicitudes?: string;

  @IsOptional() @IsInt() @Min(1) @Type(() => Number) duracionReunion?: number;
  @IsOptional() @IsInt() @Min(0) @Type(() => Number) tiempoEntreReuniones?: number;
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) cantidadTotalMesasEvento?: number;
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) capacidadPersonasPorMesa?: number;
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) montoBaseIncripcionBolivianos?: number;
  @IsOptional() @IsInt() @Min(0) @Type(() => Number) cantidadParticipantesIncluidos?: number;
  @IsOptional() @IsInt() @Min(0) @Type(() => Number) costoParticipanteExtra?: number;
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) maxParticipantesPorEmpresa?: number;

  /** Per-day meeting logistics. Absent means "leave the saved ones alone". */
  @IsOptional() horariosReunion?: unknown;
  /** QR payment rules. Absent means "leave the saved ones alone". */
  @IsOptional() @IsArray() reglasQR?: unknown[];

  @IsOptional() @IsString() @MaxLength(505) urlImagenMapaRecinto?: string;
  @IsOptional() @IsString() @MaxLength(505) urlImagenCronogramaCharlas?: string;
  @IsOptional() @IsString() @MaxLength(505) urlLogoEvento?: string;
  @IsOptional() @IsString() @MaxLength(2000) sobreElEvento?: string;
  @IsOptional() @IsString() @MaxLength(505) urlVideoEvento?: string;
  @IsOptional() @IsString() @MaxLength(1000) pilaresEvento?: string;
  @IsOptional() @IsString() @MaxLength(105) correoContacto?: string;
  @IsOptional() @IsString() @MaxLength(45) telefonoContacto?: string;
  @IsOptional() @IsString() @MaxLength(505) enlaceFacebook?: string;
  @IsOptional() @IsString() @MaxLength(505) enlaceInstagram?: string;
  @IsOptional() @IsString() @MaxLength(505) enlaceLinkedIn?: string;
  @IsOptional() @IsString() @MaxLength(505) enlaceTiktok?: string;
  @IsOptional() @IsString() @MaxLength(205) ciudadEvento?: string;
  @IsOptional() @IsString() @MaxLength(105) paisEvento?: string;
}

export class UpdateEventConfigDto {
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) duracionReunion?: number;
  @IsOptional() @IsInt() @Min(0) @Type(() => Number) tiempoEntreReuniones?: number;
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) maxParticipantesPorEmpresa?: number;
  @IsOptional() @IsInt() @Min(0) @Type(() => Number) costoParticipanteExtra?: number;
  @IsOptional() @IsInt() @Min(0) @Type(() => Number) cantidadParticipantesIncluidos?: number;
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) montoBaseIncripcionBolivianos?: number;
}
