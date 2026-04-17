import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const EVENTO_PRINCIPAL_ID = 6;

  console.log(`🔧 Corrigiendo registros para evento_id=${EVENTO_PRINCIPAL_ID}...`);

  // Actualizar empresaevento (ids 1-8 creados por el seed)
  const eeResult = await prisma.empresaevento.updateMany({
    where: { id: { in: [1,2,3,4,5,6,7,8] }, evento_id: 1 },
    data: { evento_id: EVENTO_PRINCIPAL_ID },
  });
  console.log(`✅ empresaevento actualizados: ${eeResult.count}`);

  // Actualizar mesas creadas por el seed (ids 1-15 con evento_id=1)
  const mesasResult = await prisma.mesa.updateMany({
    where: { id: { in: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15] }, evento_id: 1 },
    data: { evento_id: EVENTO_PRINCIPAL_ID },
  });
  console.log(`✅ mesas actualizadas: ${mesasResult.count}`);

  // Actualizar actividades (ids 1-4 con evento_id=1)
  const actResult = await prisma.actividadprograma.updateMany({
    where: { id: { in: [1,2,3,4] }, evento_id: 1 },
    data: { evento_id: EVENTO_PRINCIPAL_ID },
  });
  console.log(`✅ actividades actualizadas: ${actResult.count}`);

  // Actualizar noticias (ids 1-3 con evento_id=1)
  const notResult = await prisma.noticia.updateMany({
    where: { id: { in: [1,2,3] }, evento_id: 1 },
    data: { evento_id: EVENTO_PRINCIPAL_ID },
  });
  console.log(`✅ noticias actualizadas: ${notResult.count}`);

  // Actualizar reuniones (ids 1-3)
  const reunResult = await prisma.reunion.updateMany({
    where: { id: { in: [1,2,3] }, evento_id: 1 },
    data: { evento_id: EVENTO_PRINCIPAL_ID },
  });
  console.log(`✅ reuniones actualizadas: ${reunResult.count}`);

  console.log('\n🎉 Corrección completada. Todos los registros apuntan al evento principal (id=6).');
}

main()
  .catch((e) => { console.error('❌ Error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
