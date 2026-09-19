/** Renders QR payloads. Implemented with the `qrcode` package. */
export interface QrGeneratorPort {
  toDataUrl(payload: string): Promise<string>;
  toBuffer(payload: string): Promise<Buffer>;
}

export const QR_GENERATOR_PORT = Symbol('QrGeneratorPort');
