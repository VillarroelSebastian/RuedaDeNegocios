import { Injectable } from '@nestjs/common';
import QRCode from 'qrcode';
import type { QrGeneratorPort } from '../../application/ports/qr-generator.port.js';

@Injectable()
export class QrcodeGeneratorAdapter implements QrGeneratorPort {
  toDataUrl(payload: string): Promise<string> {
    return QRCode.toDataURL(payload);
  }

  toBuffer(payload: string): Promise<Buffer> {
    return QRCode.toBuffer(payload);
  }
}
