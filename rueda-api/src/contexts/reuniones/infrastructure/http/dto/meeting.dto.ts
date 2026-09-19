import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ListMeetingsQueryDto {
  @IsOptional() @IsString() @MaxLength(105) q?: string;
  @IsOptional() @IsString() @MaxLength(45) estado?: string;
  @IsOptional() @IsString() @MaxLength(45) tipo?: string;
}

export class SearchQueryDto {
  @IsOptional() @IsString() @MaxLength(105) q?: string;
}

/** The team gives a start; the event's own duration sets the end. */
export class CreateMeetingDto {
  @IsInt() @Min(1) @Type(() => Number) solicitanteId!: number;
  @IsInt() @Min(1) @Type(() => Number) receptoraId!: number;

  @IsString() @IsNotEmpty() @MaxLength(45) tipo!: string;
  @IsString() @IsNotEmpty() inicio!: string;

  @IsOptional() @IsInt() @Min(1) @Type(() => Number) mesaId?: number;
  @IsOptional() @IsString() @MaxLength(500) enlace?: string;
  @IsOptional() @IsString() @MaxLength(505) mensaje?: string;
}

export class MeetingStatusDto {
  @IsString() @IsNotEmpty() @MaxLength(45) estadoReunion!: string;
  @IsOptional() @IsString() @MaxLength(505) observaciones?: string;
  @IsOptional() @IsInt() @Min(0) @Type(() => Number) asistentes?: number;
}

export class MeetingLinkDto {
  @IsString() @IsNotEmpty() @MaxLength(500) enlace!: string;
}

export class MeetingMessageDto {
  /** `A` is the company that asked for the meeting, `B` the one that received it. */
  @IsIn(['A', 'B']) empresa!: 'A' | 'B';

  @IsString() @IsNotEmpty() @MaxLength(2000) mensaje!: string;
}

export class EvaluateMeetingDto {
  @IsInt() @Min(1) @Max(5) @Type(() => Number) calificacionA!: number;
  @IsString() @IsNotEmpty() @MaxLength(45) rangoA!: string;
  @IsString() @IsNotEmpty() @MaxLength(505) observacionesA!: string;

  @IsInt() @Min(1) @Max(5) @Type(() => Number) calificacionB!: number;
  @IsString() @IsNotEmpty() @MaxLength(45) rangoB!: string;
  @IsString() @IsNotEmpty() @MaxLength(505) observacionesB!: string;
}

export class CancelMeetingDto {
  @IsOptional() @IsString() @MaxLength(300) motivo?: string;
}

export class RescheduleDto {
  @IsString() @IsNotEmpty() inicio!: string;
  @IsOptional() @IsString() @MaxLength(45) tipoReunion?: string;
  @IsOptional() @IsString() @MaxLength(505) mensaje?: string;
}

export class RecordResultDto {
  @IsInt() @Min(1) @Max(5) @Type(() => Number) calificacion!: number;
  @IsString() @IsNotEmpty() @MaxLength(45) rango!: string;
  @IsString() @IsNotEmpty() @MaxLength(505) observaciones!: string;
}

export class RespondRescheduleDto {
  @IsBoolean() aceptar!: boolean;
  @IsOptional() @IsString() @MaxLength(505) motivo?: string;
}
