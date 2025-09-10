import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const restaurant = await prisma.restaurant.upsert({
    where: { id: 'demo-rest' },
    update: {},
    create: {
      id: 'demo-rest',
      name: 'Demo Restaurant',
      timezone: 'Asia/Karachi',
      locale: 'en-PK'
    }
  });

  // Tables
  for (let i = 1; i <= 8; i++) {
    await prisma.table.upsert({
      where: { id: `t${i}` },
      update: {},
      create: {
        id: `t${i}`,
        number: `${i}`,
        capacity: 4,
        status: 'vacant',
        restaurantId: restaurant.id
      }
    });
    await prisma.qRCode.upsert({
      where: { id: `qr${i}` },
      update: {},
      create: {
        id: `qr${i}`,
        tableId: `t${i}`,
        slug: `t${i}`,
        secret: `secret${i}`
      }
    });
  }

  // Users
  await prisma.user.upsert({
    where: { id: 'admin' },
    update: {},
    create: {
      id: 'admin',
      name: 'Admin',
      role: 'admin',
      pinHash: '1234',
      status: 'active'
    }
  });

  // Menu
  const cat = await prisma.menuCategory.upsert({
    where: { id: 'cat1' },
    update: {},
    create: { id: 'cat1', name: 'Mains', sortOrder: 1, visible: true }
  });
  await prisma.menuItem.upsert({
    where: { id: 'item1' },
    update: {},
    create: {
      id: 'item1',
      categoryId: cat.id,
      name: 'Burger',
      price: 500,
      tags: [],
      allergens: []
    }
  });

  console.log('Seed complete');
  const qrBase = 'http://localhost:5173/q/';
  const qrs = await prisma.qRCode.findMany();
  qrs.forEach(q => console.log(`Table ${q.tableId}: ${qrBase}${q.slug}`));
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
