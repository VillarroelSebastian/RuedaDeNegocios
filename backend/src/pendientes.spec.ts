import { jest } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { AuthGuard } from './auth/auth.guard.js';
import { AppController } from './app.controller.js';
import { ExtrasController } from './extras/extras.controller.js';
import { PushController } from './push/push.controller.js';
import { PushService } from './push/push.service.js';

const fn = (value: any = null) => jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue(value);
const ctx = (req:any) => ({ switchToHttp:()=>({getRequest:()=>req}) }) as any;

describe('Permisos de foro',()=>{
  function guard(){
    return new AuthGuard({verifyAsync:fn({sub:5,role:'FORO'})} as any,{
      usuario:{findFirst:fn({id:5,rolEvento:'FORO',evento_id:2,empresa_usuario:[]})},
    } as any);
  }
  it.each(['/empresa/reuniones','/empresa/empresas','/empresa/mensajes','/empresa/directorio','/empresa/oportunidades','/empresa/solicitudes','/empresa/resultados','/staff/chat-interno','/admin/empresas'])('bloquea %s aunque se acceda directamente',async path=>{
    await expect(guard().canActivate(ctx({method:'GET',path,headers:{authorization:'Bearer test'}}))).rejects.toBeInstanceOf(ForbiddenException);
  });
  it.each(['/empresa/comunicados','/empresa/actividades','/empresa/mi-paquete','/empresa/perfil','/push/config','/galeria'])('permite %s (reutiliza las pantallas de empresa)',async path=>{
    await expect(guard().canActivate(ctx({method:'GET',path,headers:{authorization:'Bearer test'}}))).resolves.toBe(true);
  });
});
describe('Registro público de foro',()=>{
  function prismaForo(existenteGlobal: any = null, evento: any = { id: 2 }){
    const usuarioCreate = fn({ id: 42 });
    const tx = {
      empresa:{create:fn({id:1})},
      empresaevento:{create:fn({id:2})},
      empresaeventocomprobantes:{create:fn({id:5})},
      usuario:{create:usuarioCreate},
      empresa_usuario:{create:fn({id:3})},
    };
    const prisma = {
      evento:{findFirst:fn(evento)},
      usuario:{findFirst:fn(existenteGlobal)},
      ciudad:{findFirst:fn({id:1})},
      $transaction: async (cb:any)=>cb(tx),
    };
    return { prisma, tx, usuarioCreate };
  }
  const datosBase = { nombres:'Ana', apellidoPaterno:'María Rocha', correo:'ana@example.com', telefono:'70000000', profesion:'Abogada', institucion:'Universidad Boliviana', comprobante:{urlComprobante:'https://cdn.example.com/comprobante.png'} };
  it('queda pendiente de verificación, con nombres/apellidos por separado y la institución como empresa',async()=>{
    const { prisma, tx } = prismaForo();
    const c = new ExtrasController(prisma as any,{} as any) as any;
    await c.registroPublicoForo(datosBase);
    const datosUsuario = (tx.usuario.create.mock.calls[0][0] as any).data;
    expect(datosUsuario).toMatchObject({ nombres:'Ana', apellidoPaterno:'María Rocha', rolEvento:'FORO', estaActivo:1 });
    const datosEmpresa = (tx.empresa.create.mock.calls[0][0] as any).data;
    expect(datosEmpresa.nombre).toBe('Universidad Boliviana');
    const datosEu = (tx.empresa_usuario.create.mock.calls[0][0] as any).data;
    expect(datosEu.cargo).toBe('Abogada');
    const datosEe = (tx.empresaevento.create.mock.calls[0][0] as any).data;
    expect(datosEe).toMatchObject({ estadoHabilitacionAcceso:'NO_HABILITADO', estadoVerificacionPago:'PENDIENTE' });
    expect((tx.empresaeventocomprobantes.create.mock.calls[0][0] as any).data).toMatchObject({ urlComprobantePagoInscripcion: datosBase.comprobante.urlComprobante });
  });
  it('rechaza el registro si no se sube un comprobante de pago',async()=>{
    const { prisma } = prismaForo();
    const c = new ExtrasController(prisma as any,{} as any) as any;
    await expect(c.registroPublicoForo({ ...datosBase, comprobante: undefined }))
      .rejects.toThrow('comprobante de pago');
  });
  it('rechaza un correo que pertenece a una cuenta interna',async()=>{
    const { prisma } = prismaForo({ id:9, rolEvento:'ADMINISTRADOR' });
    const c = new ExtrasController(prisma as any,{} as any) as any;
    await expect(c.registroPublicoForo({ ...datosBase, correo:'admin@example.com' }))
      .rejects.toThrow('cuenta interna');
  });
  it('rechaza el registro si el período de inscripción ya cerró',async()=>{
    const ayer = new Date(Date.now() - 86_400_000);
    const { prisma } = prismaForo(null, { id:2, fechaFinSolicitudes: ayer, fechaInicioSolicitudes: null });
    const c = new ExtrasController(prisma as any,{} as any) as any;
    await expect(c.registroPublicoForo(datosBase))
      .rejects.toThrow('período de inscripción cerró');
  });
  it('rechaza el registro si las inscripciones todavía no abren',async()=>{
    const manana = new Date(Date.now() + 86_400_000);
    const { prisma } = prismaForo(null, { id:2, fechaInicioSolicitudes: manana, fechaFinSolicitudes: null });
    const c = new ExtrasController(prisma as any,{} as any) as any;
    await expect(c.registroPublicoForo(datosBase))
      .rejects.toThrow('inscripciones abren');
  });
});
describe('Verificación de pagos: separa empresas y foro',()=>{
  it('admin/pagos sin tipo excluye a los usuarios de foro',async()=>{
    const findMany=fn([]),count=fn(0);
    const prisma={empresaevento:{findMany,count}};
    const c=new AppController({} as any,prisma as any,{} as any,{} as any) as any;
    c.getPrincipalEventoId=fn(2);
    await c.getPagos();
    expect(findMany.mock.calls[0][0].where.empresa_usuario).toMatchObject({some:{usuario:{rolEvento:{not:'FORO'}}}});
  });
  it('admin/pagos?tipo=FORO solo trae usuarios de foro',async()=>{
    const findMany=fn([]),count=fn(0);
    const prisma={empresaevento:{findMany,count}};
    const c=new AppController({} as any,prisma as any,{} as any,{} as any) as any;
    c.getPrincipalEventoId=fn(2);
    await c.getPagos(undefined,undefined,undefined,'FORO');
    expect(findMany.mock.calls[0][0].where.empresa_usuario).toMatchObject({some:{usuario:{rolEvento:'FORO'}}});
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
  it.each(['EMPRESA','FORO'])('prohíbe la descarga masiva a %s aunque conozca la URL',async role=>{
    await expect(new ExtrasController({} as any,{} as any).descargarTodasLasFotos({user:{role}},{} as any)).rejects.toBeInstanceOf(ForbiddenException);
  });
  it.each(['EMPRESA','FORO'])('en la galería privada, %s solo ve las fotos que subió él mismo',async role=>{
    const findMany=fn([]);
    const prisma={fotoevento:{findMany}};
    const c=new ExtrasController(prisma as any,{} as any) as any;
    c.eventoPrincipalId=fn(2);
    await c.galeriaPrivada({user:{role,sub:5,euIds:[9]}});
    expect(findMany.mock.calls[0][0]).toMatchObject({where:{evento_id:2,estaActivo:1,OR:[{usuario_id:5},{empresa_usuario_id:{in:[9]}}]}});
  });
  it('en la galería privada, el técnico ve las fotos de todos (sin filtro de autor)',async()=>{
    const findMany=fn([]);
    const prisma={fotoevento:{findMany}};
    const c=new ExtrasController(prisma as any,{} as any) as any;
    c.eventoPrincipalId=fn(2);
    await c.galeriaPrivada({user:{role:'TECNICO',sub:5,euIds:[]}});
    expect(findMany.mock.calls[0][0]).toMatchObject({where:{evento_id:2,estaActivo:1}});
    expect(findMany.mock.calls[0][0].where.OR).toBeUndefined();
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
