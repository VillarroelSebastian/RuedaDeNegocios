import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class AddTablesDto {
  @IsInt() @Min(1) @Max(100) @Type(() => Number) cantidad!: number;

  /** Defaults to the capacity the event declares for its tables. */
  @IsOptional() @IsInt() @Min(1) @Max(999) @Type(() => Number) capacidadPersonas?: number;
}

/**
 * Merges the legacy `PUT /admin/mesas/:id` and `PUT /admin/mesas/:id/habilitar`:
 * both wrote one column of the same row.
 */
export class UpdateTableDto {
  @IsOptional() @IsInt() @Min(1) @Max(999) @Type(() => Number) capacidadPersonas?: number;
  @IsOptional() @IsBoolean() estaHabilitada?: boolean;
}

export class AvailableTablesQueryDto {
  @IsString() @IsNotEmpty({ message: 'inicio y fin requeridos' }) inicio!: string;
  @IsString() @IsNotEmpty({ message: 'inicio y fin requeridos' }) fin!: string;
}

export class OccupancyQueryDto {
  @IsString()
  @IsNotEmpty({ message: 'fecha requerida (YYYY-MM-DD)' })
  fecha!: string;
}
