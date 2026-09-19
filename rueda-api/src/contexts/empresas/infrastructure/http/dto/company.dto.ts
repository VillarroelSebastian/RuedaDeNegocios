import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class ListCompaniesQueryDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() estadoPago?: string;
  @IsOptional() @IsString() ciudad?: string;
  @IsOptional() @IsString() rubro?: string;
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) page?: number;
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) limit?: number;
}

export class UpdateCompanyBasicsDto {
  @IsOptional() @IsString() @MaxLength(55) nombre?: string;
  @IsOptional() @IsString() @MaxLength(55) rubro?: string;
  @IsOptional() @IsString() @MaxLength(300) sitioWeb?: string;
  @IsOptional() @IsString() @MaxLength(1000) descripcion?: string;
  @IsOptional() @IsString() @MaxLength(45) telefonoWhatsapp?: string;
  @IsOptional() @IsString() @MaxLength(105) correoCorporativo?: string;
  @IsOptional() @IsString() @MaxLength(500) urlFotoPerfil?: string;
}

export class UpdateCommercialProfileDto {
  @IsOptional() @IsString() @MaxLength(500) oferta?: string;
  @IsOptional() @IsString() @MaxLength(500) demanda?: string;
  @IsOptional() @IsString() @MaxLength(600) interesesBusqueda?: string;
}

export class UpdateCompanyLogoDto {
  @IsString()
  @IsNotEmpty({ message: 'La imagen es obligatoria.' })
  urlFotoPerfil!: string;
}

export class UpdateOwnProfileDto {
  @IsOptional() @IsString() @MaxLength(105) nombres?: string;
  @IsOptional() @IsString() @MaxLength(65) apellidoPaterno?: string;
  @IsOptional() @IsString() @MaxLength(65) apellidoMaterno?: string;
  @IsOptional() @IsString() @MaxLength(45) telefono?: string;
  @IsOptional() @IsString() @MaxLength(505) urlFotoPerfil?: string;
}

export class DirectoryQueryDto {
  @IsOptional() @IsString() oferta?: string;
  @IsOptional() @IsString() demanda?: string;
  @IsOptional() @IsString() lugar?: string;
}
