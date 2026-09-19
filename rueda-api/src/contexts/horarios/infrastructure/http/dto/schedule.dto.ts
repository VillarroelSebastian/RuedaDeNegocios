import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class AgendaQueryDto {
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) receptoraId?: number;
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) excludeReunionId?: number;
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) solicitudId?: number;
}

export class StaffAgendaQueryDto extends AgendaQueryDto {
  @IsInt() @Min(1) @Type(() => Number) solicitanteId!: number;
}

export class HourRangeDto {
  @IsString() @IsNotEmpty() @MaxLength(5) desde!: string;
  @IsString() @IsNotEmpty() @MaxLength(5) hasta!: string;
}

export class ReplaceRangesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HourRangeDto)
  rangos!: HourRangeDto[];
}

/**
 * The days are validated by the domain, which knows the dates of the event and
 * refuses them with the message the company reads.
 */
export class SaveDailyAvailabilityDto {
  @IsArray() dias!: unknown[];
}

export class ToggleSlotDto {
  @IsString() @IsNotEmpty({ message: 'eeId, inicio y fin requeridos' }) inicio!: string;
  @IsString() @IsNotEmpty({ message: 'eeId, inicio y fin requeridos' }) fin!: string;
}
