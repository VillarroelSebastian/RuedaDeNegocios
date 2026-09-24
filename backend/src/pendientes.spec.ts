import { jest } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { AuthGuard } from './auth/auth.guard.js';
import { AppController } from './app.controller.js';
import { ForoController } from './foro/foro.controller.js';
import { ExtrasController } from './extras/extras.controller.js';
import { PushController } from './push/push.controller.js';
import { PushService } from './push/push.service.js';
import * as bcrypt from 'bcrypt';

const fn = (value: any = null) => jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue(value);
const ctx = (req:any) => ({ switchToHttp:()=>({getRequest:()=>req}) }) as any;

describe('Permisos de foro',()=>{
  function guard(){
    return new AuthGuard({verifyAsync:fn({sub:5,role:'FORO'})} as any,{
      usuario:{findFirst:fn({id:5,rolEvento:'FORO',evento_id:2,empresa_usuario:[]})},
      evento:{findFirst:fn({id:2})},
    } as any);
  }
  it.each(['/empresa/reuniones','/empresa/mensajes','/empresa/directorio','/staff/chat-interno','/admin/empresas','/galeria/descargar-todas'])('bloquea %s aunque se acceda directamente',async path=>{
    await expect(guard().canActivate(ctx({method:'GET',path,headers:{authorization:'Bearer test'}}))).rejects.toBeInstanceOf(ForbiddenException);
  });
  it.each(['/foro/contenido','/foro/perfil','/push/config','/galeria'])('permite %s',async path=>{
    await expect(guard().canActivate(ctx({method:'GET',path,headers:{authorization:'Bearer test'}}))).resolves.toBe(true);
  });
  it('crea una cuenta personal sin empresa y sin aceptar un rol del cliente',async()=>{
    const create=fn(),tx={$queryRaw:fn(),usuario:{findFirst:fn(),create}};
    const prisma={evento:{findFirst:fn({id:2})},$transaction:async(cb:any)=>cb(tx)};
    await new ForoController(prisma as any).registrar({nombres:'Ana',apellidoPaterno:'Pérez',correo:' ANA@example.com ',telefono:'12345678',contrasenia:'Clave 1234',rolEvento:'ADMINISTRADOR'});
    const data=(create.mock.calls[0][0] as any).data;
    expect(data).toMatchObject({rolEvento:'FORO',correo:'ana@example.com',evento_id:2});
    expect(await bcrypt.compare('Clave 1234',data.contrasenia)).toBe(true);
  });
  it('rechaza un correo existente sin reemplazar su cuenta',async()=>{
    const create=fn(),tx={$queryRaw:fn(),usuario:{findFirst:fn({id:1}),create}};
    const prisma={evento:{findFirst:fn({id:2})},$transaction:async(cb:any)=>cb(tx)};
    await expect(new ForoController(prisma as any).registrar({nombres:'Ana',apellidoPaterno:'Pérez',correo:'ana@example.com',telefono:'12345678',contrasenia:'Clave1234'})).rejects.toThrow('ya tiene una cuenta');
    expect(create).not.toHaveBeenCalled();
  });
});
describe('Mensajes y galería',()=>{
  it('permite que una empresa inicie la conversación con receptor 0',async()=>{
    const prisma={empresa_usuario:{findFirst:fn({id:4,esResponsable:1})},mensajeempresa:{create:fn({id:9,fechaCreacion:new Date()})},empresaevento:{findUnique:fn({empresa:{nombre:'Empresa'}})}};
    const c=new AppController({} as any,prisma as any,{emitirParaStaff:jest.fn()} as any,{} as any) as any;
    c.getPrincipalEventoId=fn(2);c.notificarStaff=fn();
    await expect(c.enviarMensajeEmpresa({eeId:7,euId:4,receptorEeId:0,contenido:'Necesito ayuda'})).resolves.toMatchObject({ok:true});
    expect(c.notificarStaff).toHaveBeenCalled();
  });
  it('prohíbe la descarga masiva a empresas aunque conozcan la URL',async()=>{
    await expect(new ExtrasController({} as any,{} as any).descargarTodasLasFotos({user:{role:'EMPRESA'}},{} as any)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
describe('Suscripciones push',()=>{
  it.each(['ADMINISTRADOR','TECNICO','TECNICO_EVENTOS','EMPRESA','FORO'])('registra el dispositivo del rol %s usando su identidad autenticada',async role=>{
    const upsert=fn(),prisma={pushsubscription:{findUnique:fn(),count:fn(0),upsert}};
    await new PushController(prisma as any,{} as any).registrar({user:{sub:11,role}},{tipo:'expo',token:'ExpoPushToken[abcdef]',usuarioId:999});
    expect(upsert.mock.calls[0][0]).toMatchObject({create:{usuarioId:11}});
  });
  it('rechaza destinos web arbitrarios antes de guardarlos',async()=>{
    const c=new PushController({} as any,{publicKey:'test'} as any);
    await expect(c.registrar({user:{sub:1}},{tipo:'web',endpoint:'https://localhost/private',keys:{p256dh:'a'.repeat(87),auth:'b'.repeat(22)}})).rejects.toThrow('inválida');
  });
  it('un usuario no puede borrar la suscripción de otro',async()=>{
    const del=fn();
    await new PushController({pushsubscription:{deleteMany:del}} as any,{} as any).eliminar({user:{sub:11}},{token:'ExpoPushToken[abcdef]',usuarioId:999});
    expect(del.mock.calls[0][0]).toMatchObject({where:{usuarioId:11}});
  });
});
describe('Entrega push',()=>{
  const original=global.fetch;
  afterEach(()=>{global.fetch=original;});
  function setup(ticketId:string|null=null){
    const job={id:1,estado:ticketId?'RECIBO':'PENDIENTE',proximoIntento:new Date(),intentos:0,fechaCreacion:new Date(),ticketId,contenido:{title:'Aviso',body:'Mensaje',data:{usuarioId:7}},
      subscription:{id:2,usuarioId:7,tipo:'expo',destino:'ExpoPushToken[abcdef]',usuario:{estaActivo:1,rolEvento:'EMPRESA'}}};
    const prisma={pushdelivery:{findMany:fn([job]),updateMany:fn({count:1}),update:fn()},pushsubscription:{deleteMany:fn()}};
    return {prisma,service:new PushService(prisma as any)};
  }
  it('guarda el recibo pendiente; aceptar en Expo no se confunde con entrega',async()=>{
    const {prisma,service}=setup();
    global.fetch=fn({ok:true,json:async()=>({data:{status:'ok',id:'receipt-1'}})}) as any;
    await service.procesar();
    expect(prisma.pushdelivery.update.mock.calls[0][0]).toMatchObject({data:{estado:'RECIBO',ticketId:'receipt-1'}});
  });
  it('reintenta un fallo temporal sin perder el envío',async()=>{
    const {prisma,service}=setup();
    global.fetch=jest.fn<(...args:any[])=>Promise<any>>().mockRejectedValue(new Error('Network')) as any;
    await service.procesar();
    expect(prisma.pushdelivery.updateMany.mock.calls.at(-1)?.[0]).toMatchObject({data:{estado:'PENDIENTE',error:'Network'}});
  });
  it('elimina un token desinstalado informado por el recibo',async()=>{
    const {prisma,service}=setup('receipt-1');
    global.fetch=fn({ok:true,json:async()=>({data:{'receipt-1':{status:'error',details:{error:'DeviceNotRegistered'}}}})}) as any;
    await service.procesar();
    expect(prisma.pushsubscription.deleteMany).toHaveBeenCalledWith({where:{id:2}});
  });
  it('cancela un envío pendiente si el dispositivo ahora pertenece a otra cuenta',async()=>{
    const {prisma,service}=setup();
    const jobs=await prisma.pushdelivery.findMany();jobs[0].subscription.usuarioId=99;
    global.fetch=fn() as any;
    await service.procesar();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(prisma.pushdelivery.update).toHaveBeenCalledWith({where:{id:1},data:{estado:'CANCELADA'}});
  });
});
