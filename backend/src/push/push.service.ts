import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class PushService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PushService.name);
  private timer?: ReturnType<typeof setInterval>;
  private trabajando = false;
  readonly publicKey = process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT
    ? process.env.VAPID_PUBLIC_KEY : null;
  constructor(private readonly prisma: PrismaService) {
    if (this.publicKey) webpush.setVapidDetails(process.env.VAPID_SUBJECT!, this.publicKey, process.env.VAPID_PRIVATE_KEY!);
  }
  onModuleInit() { this.timer=setInterval(()=>void this.procesar(),10000);this.timer.unref();void this.procesar(); }
  onModuleDestroy() { if(this.timer)clearInterval(this.timer); }
  async enviar(audiencia: number | 'staff' | 'foro' | 'global', tipo: string, payload: any) {
    if (!payload.titulo || !payload.mensaje) return;
    try {
      const evento = await this.prisma.evento.findFirst({ where: { esPrincipal: 1, estaActivo: { not: 0 } }, select: { id: true } });
      if (!evento) return;
      const staff = { rolEvento: { in: ['ADMINISTRADOR', 'TECNICO', 'TECNICO_EVENTOS'] } };
      const foro = { rolEvento: 'FORO', evento_id: evento.id };
      const empresa = { rolEvento: 'EMPRESA', empresa_usuario: { some: {
        estaActivo: 1, ...(typeof audiencia === 'number' ? { empresaevento_id: audiencia } : {}),
        empresaevento: { evento_id: evento.id, estaActivo: 1, estadoHabilitacionAcceso: 'HABILITADO', estadoVerificacionPago: 'COMPLETADO' },
      } } };
      const usuarios = await this.prisma.usuario.findMany({
        where: { estaActivo: 1, id: { not: Number(payload.excludeUserId) || 0 },
          ...(audiencia === 'staff' ? staff : audiencia === 'foro' ? foro : typeof audiencia === 'number' ? empresa : { OR: [staff, empresa, foro] }) },
        select: { id: true, rolEvento: true },
      });
      const roles = new Map(usuarios.map((u) => [u.id, u.rolEvento]));
      const destinos = await this.prisma.pushsubscription.findMany({ where: { usuarioId: { in: usuarios.map((u) => u.id) },
        actualizado: { gte: new Date(Date.now() - 90 * 86400000) } } });
      if(!destinos.length)return;
      await this.prisma.pushdelivery.createMany({data:destinos.map(destino=>{
        const role=roles.get(destino.usuarioId);
        const base=role==='FORO'?'/foro':role==='EMPRESA'?'/empresa':role==='ADMINISTRADOR'?'/admin':'/tecnico';
        const url=base==='/foro'?'/foro':base+(tipo.startsWith('chat-interno')?'/equipo':tipo.startsWith('mensaje')?'/mensajes':'/dashboard');
        return {subscriptionId:destino.id,contenido:{title:String(payload.titulo).slice(0,150),body:String(payload.mensaje).slice(0,500),
          data:{url,tipo,usuarioId:destino.usuarioId,referenciaId:payload.referenciaId||0},tag:tipo}};
      })});
      void this.procesar();
    }catch{this.logger.error('No se pudo guardar la cola push.');}
  }
  private async expo(ruta:string,body:object){
    const res=await fetch('https://exp.host/--/api/v2/push/'+ruta,{method:'POST',signal:AbortSignal.timeout(10000),
      headers:{'Content-Type':'application/json',...(process.env.EXPO_ACCESS_TOKEN?{Authorization:'Bearer '+process.env.EXPO_ACCESS_TOKEN}:{})},body:JSON.stringify(body)});
    if(!res.ok)throw new Error('Expo HTTP '+res.status);
    const json=await res.json() as any;if(json.errors?.length)throw new Error('Expo rechazó la solicitud');return json.data;
  }
  async procesar(){
    if(this.trabajando)return;this.trabajando=true;
    try{
      const jobs=await this.prisma.pushdelivery.findMany({where:{estado:{in:['PENDIENTE','RECIBO','ENVIANDO']},proximoIntento:{lte:new Date()}},include:{subscription:{include:{usuario:{select:{estaActivo:true,rolEvento:true}}}}},orderBy:{id:'asc'},take:50});
      for(let i=0;i<jobs.length;i+=5)await Promise.all(jobs.slice(i,i+5).map(async job=>{
        // Lease avoids duplicates across PM2 workers; expired leases recover after a restart.
        const claim=await this.prisma.pushdelivery.updateMany({where:{id:job.id,estado:job.estado,proximoIntento:job.proximoIntento},data:{estado:'ENVIANDO',proximoIntento:new Date(Date.now()+120000),intentos:{increment:1}}});
        if(!claim.count)return;
        const sub=job.subscription,contenido=job.contenido as any;
        try{
          if(!sub.usuario.estaActivo||Number(contenido.data?.usuarioId)!==sub.usuarioId){
            await this.prisma.pushdelivery.update({where:{id:job.id},data:{estado:'CANCELADA'}});return;
          }
          if(Date.now()-job.fechaCreacion.getTime()>24*3600000){
            await this.prisma.pushdelivery.update({where:{id:job.id},data:{estado:'FALLIDA',error:'Notificación vencida'}});return;
          }
          if(sub.tipo==='web'){
            if(!this.publicKey)throw new Error('VAPID sin configurar');
            await webpush.sendNotification({endpoint:sub.destino,keys:{p256dh:sub.p256dh!,auth:sub.auth!}},JSON.stringify(contenido),{TTL:3600,timeout:10000});
            await this.prisma.pushdelivery.update({where:{id:job.id},data:{estado:'ENTREGADA',error:null}});return;
          }
          if(job.ticketId){
            const receipts=await this.expo('getReceipts',{ids:[job.ticketId]});
            const receipt=receipts?.[job.ticketId];
            if(!receipt){await this.prisma.pushdelivery.update({where:{id:job.id},data:{estado:'RECIBO',proximoIntento:new Date(Date.now()+15*60000)}});return;}
            if(receipt.status==='ok'){await this.prisma.pushdelivery.update({where:{id:job.id},data:{estado:'ENTREGADA',error:null}});return;}
            if(receipt.details?.error==='DeviceNotRegistered'){await this.prisma.pushsubscription.deleteMany({where:{id:sub.id}});return;}
            throw new Error(receipt.details?.error||'Error de entrega Expo');
          }
          const ticket=await this.expo('send',{to:sub.destino,sound:'default',channelId:'eventos',priority:'high',ttl:3600,title:contenido.title,body:contenido.body,data:contenido.data});
          if(ticket?.details?.error==='DeviceNotRegistered'){await this.prisma.pushsubscription.deleteMany({where:{id:sub.id}});return;}
          if(ticket?.status!=='ok'||!ticket.id)throw new Error(ticket?.details?.error||'Expo no aceptó el envío');
          await this.prisma.pushdelivery.update({where:{id:job.id},data:{estado:'RECIBO',ticketId:ticket.id,proximoIntento:new Date(Date.now()+15*60000),error:null}});
        }catch(error:any){
          if([404,410].includes(error?.statusCode)){await this.prisma.pushsubscription.deleteMany({where:{id:sub.id}});return;}
          const terminal=job.intentos>=5||['InvalidCredentials','MismatchSenderId','MessageTooBig'].includes(error?.message);
          await this.prisma.pushdelivery.updateMany({where:{id:job.id},data:{estado:terminal?'FALLIDA':job.ticketId?'RECIBO':'PENDIENTE',
            proximoIntento:new Date(Date.now()+Math.min(3600,30*2**job.intentos)*1000),error:String(error?.message||'Error push').slice(0,255)}});
          this.logger.warn('Entrega push '+job.id+': '+(terminal?'falló':'se reintentará'));
        }
      }));
    }catch{this.logger.error('No se pudo procesar la cola push.');}finally{this.trabajando=false;}
  }
}
