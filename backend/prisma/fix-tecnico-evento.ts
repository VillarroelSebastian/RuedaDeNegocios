import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const result = await prisma.usuario.updateMany({
    where: { rolEvento: 'TECNICO', evento_id: null },
    data: { evento_id: 6 },
  });
  console.log(`✅ Técnicos asignados al evento 6: ${result.count}`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
