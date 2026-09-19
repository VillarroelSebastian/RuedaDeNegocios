import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';

/** The company writing and the person writing both come from the token. */
export class SendMessageDto {
  @IsInt() @Min(1) @Type(() => Number) receptorEeId!: number;

  @IsString()
  @IsNotEmpty({ message: 'El mensaje no puede estar vacío' })
  @MaxLength(1000)
  contenido!: string;
}

export class SendStaffMessageDto {
  @IsInt() @Min(1) @Type(() => Number) receptorEeId!: number;

  @IsString()
  @IsNotEmpty({ message: 'El mensaje no puede estar vacío' })
  @MaxLength(1000)
  contenido!: string;
}
