import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Only the shape is checked here. The schedule rules — the day belonging to the
 * event, the activity ending after it starts — live in the domain, which refuses
 * them with the message the staff reads.
 */
export class SaveActivityDto {
  @IsOptional() @IsString() @MaxLength(45) tipoActividad?: string;

  @IsString() @IsNotEmpty() @MaxLength(255) nombreActividad!: string;
  @IsString() @IsNotEmpty() @MaxLength(450) descripcionActividad!: string;
  @IsString() @IsNotEmpty() @MaxLength(155) nombreSalaEspacio!: string;

  @IsInt() @Min(1) @Type(() => Number) capacidadPersonasSala!: number;

  /** `YYYY-MM-DD`. */
  @IsString() @IsNotEmpty() @MaxLength(30) fechaActividad!: string;
  /** `HH:MM`. */
  @IsString() @IsNotEmpty() @MaxLength(8) horaInicioActividad!: string;
  @IsString() @IsNotEmpty() @MaxLength(8) horaFinActividad!: string;

  @IsOptional() @IsString() @MaxLength(450) nombreCompletoPilaExpositor?: string;
  @IsOptional() @IsString() @MaxLength(150) organizacionDelExpositor?: string;
  @IsOptional() @IsString() @MaxLength(505) urlImagenBannerActividad?: string;
  @IsOptional() @IsString() @MaxLength(45) estadoActividad?: string;
  @IsOptional() @IsString() @MaxLength(505) linkReunionVirtual?: string;
  @IsOptional() @IsString() @MaxLength(205) direccionTexto?: string;
  @IsOptional() @IsString() @MaxLength(505) ubicacionGoogleMapsPresencial?: string;
}

export class ListActivitiesQueryDto {
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) eventId?: number;
}

export class UpcomingActivitiesQueryDto {
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) limit?: number;
}

export class SubscriptionDto {
  @IsBoolean() suscrito!: boolean;
}

export class AnnouncementDto {
  @IsString()
  @IsNotEmpty({ message: 'El anuncio es obligatorio.' })
  @MaxLength(500)
  mensaje!: string;
}

export class LiveStatusDto {
  @IsString() @IsNotEmpty() @MaxLength(20) estadoEnVivo!: string;
  @IsOptional() @IsString() @MaxLength(305) notaEnVivo?: string;
}
