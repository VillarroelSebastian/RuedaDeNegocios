import { Body, Controller, Delete, Param, Put, Req } from '@nestjs/common';
import { MensajeriaService } from './mensajeria.service.js';

@Controller('mensajeria')
export class MensajeriaController {
  constructor(private readonly service: MensajeriaService) {}
  @Put(':canal/:id')
  editar(@Req() req: any, @Param('canal') canal: string, @Param('id') id: string, @Body() body: { contenido: string }) {
    if (typeof body.contenido !== 'string') return this.service.modificar(req.user, canal, Number(id), '');
    return this.service.modificar(req.user, canal, Number(id), body.contenido);
  }
  @Delete('conversacion')
  borrarConversacion(@Req() req: any, @Body() body: { canal: string; eeId?: number; otroEeId: number }) {
    return this.service.borrarConversacion(req.user, body);
  }
  @Delete(':canal/:id')
  eliminar(@Req() req: any, @Param('canal') canal: string, @Param('id') id: string) {
    return this.service.modificar(req.user, canal, Number(id));
  }
}
