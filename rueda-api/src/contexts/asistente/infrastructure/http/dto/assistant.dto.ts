import { IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import type { BookingContext } from '../../../domain/models/assistant-dialog.js';

export class AssistantMessageDto {
  @IsString() @IsNotEmpty() @MaxLength(500) mensaje!: string;

  /**
   * Where the booking conversation stood, as the previous answer handed it
   * back. It is the client's copy of the state, so nothing it claims is
   * trusted: every step re-reads it and the request itself is re-validated by
   * the requests context.
   */
  @IsOptional() @IsObject() contexto?: BookingContext;
}
