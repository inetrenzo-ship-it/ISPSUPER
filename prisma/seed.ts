import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL!;
  const adminPassword = process.env.ADMIN_PASSWORD!;
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.globalConfig.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, topeGlobalByPlan: true, carryoverOn: true }
  });

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash },
    create: { email: adminEmail, passwordHash, role: Role.ADMIN }
  });

  const commerce = await prisma.commerce.upsert({
    where: { id: 'demo-commerce' },
    update: {},
    create: {
      id: 'demo-commerce',
      name: 'Super Demo',
      cuit: '20-12345678-9',
      locality: 'Cordoba',
      benefitPercent: 0.10
    }
  });

  const cashierPass = await bcrypt.hash('caja123', 10);
  const cashier1 = await prisma.user.upsert({
    where: { email: 'caja1@demo.com' },
    update: {},
    create: { email: 'caja1@demo.com', passwordHash: cashierPass, role: Role.CAJA, commerceId: commerce.id }
  });
  await prisma.user.upsert({
    where: { email: 'caja2@demo.com' },
    update: {},
    create: { email: 'caja2@demo.com', passwordHash: cashierPass, role: Role.CAJA, commerceId: commerce.id }
  });

  await prisma.client.createMany({
    data: [
      { firstName: 'Juan', lastName: 'Perez', dni: '30111222', phone: '3511111111', plan: 'Plan A', planPrice: 10000, enabled: true },
      { firstName: 'Ana', lastName: 'Gomez', dni: '28999888', phone: '3512222222', plan: 'Plan B', planPrice: 15000, enabled: true },
      { firstName: 'Luis', lastName: 'Suarez', dni: '31222333', phone: '3513333333', plan: 'Plan A', planPrice: 10000, enabled: true }
    ],
    skipDuplicates: true
  });

  const juan = await prisma.client.findUniqueOrThrow({ where: { dni: '30111222' } });
  const ana  = await prisma.client.findUniqueOrThrow({ where: { dni: '28999888' } });

  await prisma.sale.createMany({
    data: [
      { commerceId: commerce.id, cashierId: cashier1.id, clientId: juan.id, amount: 5000, ticketNumber: '1001', benefitPercent: commerce.benefitPercent, benefitAmount: 5000 * commerce.benefitPercent },
      { commerceId: commerce.id, cashierId: cashier1.id, clientId: ana.id,  amount: 8000, ticketNumber: '1002', benefitPercent: commerce.benefitPercent, benefitAmount: 8000 * commerce.benefitPercent }
    ],
    skipDuplicates: true
  });

  console.log('Seed completed.');
}

main().finally(async () => prisma.$disconnect());
