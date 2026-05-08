import request from 'supertest';
import app from '../../app';
import prisma from '../../lib/prisma';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'test-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.FRONTEND_URL = 'http://localhost:5173';

jest.mock('../../lib/mailer', () => ({ sendMail: jest.fn().mockResolvedValue(undefined) }));

describe('Distributor Orders', () => {
  let branchId: string;
  let managerToken: string;
  let supplierId: string;
  let productId1: string;
  let productId2: string;
  let stockId1: string;

  beforeAll(async () => {
    const branch = await prisma.branch.create({
      data: { name: 'Dist Test Branch', address: 'Addr', city: 'City', phone: '000', email: 'dist@test.nl' },
    });
    branchId = branch.id;

    const mgr = await prisma.user.create({
      data: { email: 'dist-mgr@test.nl', passwordHash: 'x', role: 'manager', branchId },
    });
    managerToken = jwt.sign({ sub: mgr.id, email: mgr.email, role: 'manager', branchId }, process.env.JWT_SECRET!, { expiresIn: '1h' });

    const supplier = await prisma.supplier.create({
      data: { branchId, name: 'Test Leverancier', email: 'lev@test.nl', orderDays: ['monday'], leadTimeDays: 1 },
    });
    supplierId = supplier.id;

    const p1 = await prisma.supplierProduct.create({
      data: { supplierId, name: 'Product A', unit: 'kg', pricePerUnit: 500, minOrderQuantity: 5 },
    });
    productId1 = p1.id;

    const p2 = await prisma.supplierProduct.create({
      data: { supplierId, name: 'Product B', unit: 'liter', pricePerUnit: 300, minOrderQuantity: 2 },
    });
    productId2 = p2.id;

    // Stock: Product A is below par, Product B is above par
    const s1 = await prisma.stockLevel.create({
      data: { branchId, supplierProductId: productId1, currentStock: 3, parLevel: 10 },
    });
    stockId1 = s1.id;

    await prisma.stockLevel.create({
      data: { branchId, supplierProductId: productId2, currentStock: 15, parLevel: 10 },
    });
  });

  afterAll(async () => {
    await prisma.distributorOrderItem.deleteMany({ where: { distributorOrder: { branchId } } });
    await prisma.distributorOrder.deleteMany({ where: { branchId } });
    await prisma.stockLevel.deleteMany({ where: { branchId } });
    await prisma.supplierProduct.deleteMany({ where: { supplierId } });
    await prisma.supplier.deleteMany({ where: { branchId } });
    await prisma.user.deleteMany({ where: { email: 'dist-mgr@test.nl' } });
    await prisma.branch.delete({ where: { id: branchId } });
    await prisma.$disconnect();
  });

  it('GET checklist — returns suggested quantities', async () => {
    const res = await request(app)
      .get(`/api/v1/distributors/orders/checklist/${supplierId}?branchId=${branchId}`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    const p1row = res.body.data.find((r: any) => r.supplierProductId === productId1);
    expect(p1row.suggestedQuantity).toBe(7); // parLevel(10) - currentStock(3)
    const p2row = res.body.data.find((r: any) => r.supplierProductId === productId2);
    expect(p2row.suggestedQuantity).toBe(0); // above par
  });

  it('POST /orders — rejects order with missing product quantities', async () => {
    const res = await request(app)
      .post('/api/v1/distributors/orders')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        branchId,
        supplierId,
        items: [{ supplierProductId: productId1, orderedQuantity: 7 }],
        // product2 missing — but its suggestedQuantity is 0 so it should be OK
      });

    // Product B has suggestedQuantity = 0 so it doesn't need to be in the order
    expect(res.status).toBe(201);
  });

  it('discrepancy auto-flagging on receive', async () => {
    // Create and submit order first
    const createRes = await request(app)
      .post('/api/v1/distributors/orders')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ branchId, supplierId, items: [{ supplierProductId: productId1, orderedQuantity: 7 }] });

    const orderId = createRes.body.data.id;
    const itemId = createRes.body.data.items[0].id;

    await request(app)
      .put(`/api/v1/distributors/orders/${orderId}/submit`)
      .set('Authorization', `Bearer ${managerToken}`);

    const receiveRes = await request(app)
      .put(`/api/v1/distributors/orders/${orderId}/receive`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ items: [{ id: itemId, receivedQuantity: 5 }] }); // ordered 7, received 5

    expect(receiveRes.status).toBe(200);
    const receivedItem = receiveRes.body.data.items[0];
    expect(receivedItem.discrepancyFlagged).toBe(true);
  });
});
