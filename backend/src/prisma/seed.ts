import { PrismaClient, Role, ContractType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ── Branches ──────────────────────────────────────────────────────────────
  const amsterdam = await prisma.branch.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Podomoro Amsterdam',
      address: 'Damrak 1',
      city: 'Amsterdam',
      phone: '020-1234567',
      email: 'amsterdam@podomoro.nl',
    },
  });

  const rotterdam = await prisma.branch.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Podomoro Rotterdam',
      address: 'Coolsingel 40',
      city: 'Rotterdam',
      phone: '010-9876543',
      email: 'rotterdam@podomoro.nl',
    },
  });

  console.log('Branches created:', amsterdam.name, rotterdam.name);

  // ── Users ─────────────────────────────────────────────────────────────────
  const hash = (pw: string) => bcrypt.hash(pw, 12);

  const owner = await prisma.user.upsert({
    where: { email: 'eigenaar@podomoro.nl' },
    update: {},
    create: {
      email: 'eigenaar@podomoro.nl',
      passwordHash: await hash('Owner@1234'),
      role: Role.owner,
      branchId: null,
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@podomoro.nl' },
    update: {},
    create: {
      email: 'manager@podomoro.nl',
      passwordHash: await hash('Manager@1234'),
      role: Role.manager,
      branchId: amsterdam.id,
    },
  });

  const cashier = await prisma.user.upsert({
    where: { email: 'kassa@podomoro.nl' },
    update: {},
    create: {
      email: 'kassa@podomoro.nl',
      passwordHash: await hash('Cashier@1234'),
      role: Role.cashier,
      branchId: amsterdam.id,
    },
  });

  const staff1 = await prisma.user.upsert({
    where: { email: 'medewerker1@podomoro.nl' },
    update: {},
    create: {
      email: 'medewerker1@podomoro.nl',
      passwordHash: await hash('Staff@1234'),
      role: Role.staff,
      branchId: amsterdam.id,
    },
  });

  const staff2 = await prisma.user.upsert({
    where: { email: 'medewerker2@podomoro.nl' },
    update: {},
    create: {
      email: 'medewerker2@podomoro.nl',
      passwordHash: await hash('Staff@1234'),
      role: Role.staff,
      branchId: rotterdam.id,
    },
  });

  const boekhouder = await prisma.user.upsert({
    where: { email: 'boekhouder@podomoro.nl' },
    update: {},
    create: {
      email: 'boekhouder@podomoro.nl',
      passwordHash: await hash('Boekhouder@1234'),
      role: Role.boekhouder,
      branchId: null,
    },
  });

  console.log('Users created:', [owner, manager, cashier, staff1, staff2, boekhouder].map(u => u.email).join(', '));

  // ── Menu Items ────────────────────────────────────────────────────────────
  const menuItems = [
    {
      name: 'Spaghetti Bolognese',
      description: 'Klassieke Italiaanse pasta met gehakt en tomatensaus',
      price: 1395,
      category: 'pasta',
      allergens: ['gluten', 'melk'],
    },
    {
      name: 'Pad Thai met Garnalen',
      description: 'Rijstnoedels met garnalen, pinda en tauge',
      price: 1595,
      category: 'hoofdgerecht',
      allergens: ['schaaldieren', 'pinda', 'gluten', 'soja'],
    },
    {
      name: 'Margherita Pizza',
      description: 'Verse tomaat, mozzarella en basilicum',
      price: 1195,
      category: 'pizza',
      allergens: ['gluten', 'melk'],
    },
    {
      name: 'Caesar Salade',
      description: 'Romaine sla, croutons, parmezaan en caesar dressing',
      price: 995,
      category: 'salade',
      allergens: ['gluten', 'melk', 'eieren', 'vis'],
    },
    {
      name: 'Frisdrank',
      description: 'Cola, Sprite of Fanta (33cl)',
      price: 295,
      category: 'dranken',
      allergens: [],
    },
  ];

  for (const item of menuItems) {
    await prisma.menuItem.upsert({
      where: {
        id: `00000000-0000-0000-0001-${String(menuItems.indexOf(item) + 1).padStart(12, '0')}`,
      },
      update: {},
      create: {
        id: `00000000-0000-0000-0001-${String(menuItems.indexOf(item) + 1).padStart(12, '0')}`,
        branchId: amsterdam.id,
        ...item,
      },
    });
  }

  console.log('Menu items created:', menuItems.length);

  // ── Recipes ───────────────────────────────────────────────────────────────
  const recipe1 = await prisma.recipe.upsert({
    where: { id: '00000000-0000-0000-0002-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0002-000000000001',
      branchId: amsterdam.id,
      name: 'Bolognese Saus',
      basePortions: 10,
      createdBy: manager.id,
    },
  });

  await prisma.recipeIngredient.createMany({
    skipDuplicates: true,
    data: [
      { recipeId: recipe1.id, ingredientName: 'Gehakt', amount: 1.5, unit: 'kg' },
      { recipeId: recipe1.id, ingredientName: 'Tomatenpuree', amount: 0.5, unit: 'kg' },
      { recipeId: recipe1.id, ingredientName: 'Ui', amount: 3, unit: 'stuk' },
      { recipeId: recipe1.id, ingredientName: 'Olijfolie', amount: 0.05, unit: 'liter' },
    ],
  });

  const recipe2 = await prisma.recipe.upsert({
    where: { id: '00000000-0000-0000-0002-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0002-000000000002',
      branchId: amsterdam.id,
      name: 'Caesar Dressing',
      basePortions: 20,
      createdBy: manager.id,
    },
  });

  await prisma.recipeIngredient.createMany({
    skipDuplicates: true,
    data: [
      { recipeId: recipe2.id, ingredientName: 'Mayonaise', amount: 0.3, unit: 'kg' },
      { recipeId: recipe2.id, ingredientName: 'Parmezaan', amount: 0.1, unit: 'kg' },
      { recipeId: recipe2.id, ingredientName: 'Ansjovis', amount: 0.05, unit: 'kg' },
      { recipeId: recipe2.id, ingredientName: 'Knoflook', amount: 4, unit: 'stuk' },
    ],
  });

  const recipe3 = await prisma.recipe.upsert({
    where: { id: '00000000-0000-0000-0002-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-0000-0002-000000000003',
      branchId: amsterdam.id,
      name: 'Pizzadeeg',
      basePortions: 8,
      createdBy: manager.id,
    },
  });

  await prisma.recipeIngredient.createMany({
    skipDuplicates: true,
    data: [
      { recipeId: recipe3.id, ingredientName: 'Bloem', amount: 0.8, unit: 'kg' },
      { recipeId: recipe3.id, ingredientName: 'Gist', amount: 0.007, unit: 'kg' },
      { recipeId: recipe3.id, ingredientName: 'Water', amount: 0.5, unit: 'liter' },
      { recipeId: recipe3.id, ingredientName: 'Olijfolie', amount: 0.03, unit: 'liter' },
    ],
  });

  console.log('Recipes created: 3');

  // ── Suppliers ─────────────────────────────────────────────────────────────
  const supplier1 = await prisma.supplier.upsert({
    where: { id: '00000000-0000-0000-0003-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0003-000000000001',
      branchId: amsterdam.id,
      name: 'Groothandel De Vries',
      contactPerson: 'Jan de Vries',
      email: 'bestellingen@devries-groothandel.nl',
      phone: '020-5551234',
      orderDays: ['monday', 'thursday'],
      leadTimeDays: 1,
    },
  });

  const prod1 = await prisma.supplierProduct.upsert({
    where: { id: '00000000-0000-0000-0004-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0004-000000000001',
      supplierId: supplier1.id,
      name: 'Gehakt (rund)',
      unit: 'kg',
      pricePerUnit: 1250,
      minOrderQuantity: 5,
    },
  });

  const prod2 = await prisma.supplierProduct.upsert({
    where: { id: '00000000-0000-0000-0004-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0004-000000000002',
      supplierId: supplier1.id,
      name: 'Pasta (spaghetti)',
      unit: 'kg',
      pricePerUnit: 185,
      minOrderQuantity: 10,
    },
  });

  const supplier2 = await prisma.supplier.upsert({
    where: { id: '00000000-0000-0000-0003-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0003-000000000002',
      branchId: amsterdam.id,
      name: 'FrisdrankDirect BV',
      contactPerson: 'Marieke Smit',
      email: 'orders@frisdrank-direct.nl',
      phone: '020-5559876',
      orderDays: ['tuesday', 'friday'],
      leadTimeDays: 2,
    },
  });

  const prod3 = await prisma.supplierProduct.upsert({
    where: { id: '00000000-0000-0000-0004-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-0000-0004-000000000003',
      supplierId: supplier2.id,
      name: 'Cola (24x33cl)',
      unit: 'stuk',
      pricePerUnit: 1650,
      minOrderQuantity: 2,
    },
  });

  console.log('Suppliers and products created');

  // ── Stock Levels ──────────────────────────────────────────────────────────
  await prisma.stockLevel.createMany({
    skipDuplicates: true,
    data: [
      { branchId: amsterdam.id, supplierProductId: prod1.id, currentStock: 8, parLevel: 15 },
      { branchId: amsterdam.id, supplierProductId: prod2.id, currentStock: 20, parLevel: 25 },
      { branchId: amsterdam.id, supplierProductId: prod3.id, currentStock: 4, parLevel: 10 },
    ],
  });

  console.log('Stock levels created');
  console.log('\nSeed completed successfully!');
  console.log('\nTest credentials:');
  console.log('  owner:      eigenaar@podomoro.nl   / Owner@1234');
  console.log('  manager:    manager@podomoro.nl    / Manager@1234');
  console.log('  cashier:    kassa@podomoro.nl      / Cashier@1234');
  console.log('  staff:      medewerker1@podomoro.nl/ Staff@1234');
  console.log('  boekhouder: boekhouder@podomoro.nl / Boekhouder@1234');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
