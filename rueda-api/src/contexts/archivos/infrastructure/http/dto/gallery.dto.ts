import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class ListPhotosQueryDto {
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) limit?: number;

  /** The legacy clients send `1` or `true`; both mean the same thing. */
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  soloTecnicos?: boolean;
}

export class AddPhotoDto {
  @IsString() @IsNotEmpty() @MaxLength(505) urlFoto!: string;
  @IsOptional() @IsString() @MaxLength(305) descripcion?: string;
}
