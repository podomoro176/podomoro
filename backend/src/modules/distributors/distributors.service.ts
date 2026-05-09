import prisma from '../../lib/prisma';
import { sendMail } from '../../lib/mailer';
import {
  CreateSupplierInput, CreateProductInput, CreateOrderInput, ReceiveOrderInput,
} from './distributors.schema';

// ── Suppliers ─────────────────────────────────────────────────────────────────

export async function listSuppliers(branchId: string) {
  return prisma.supplier.findMany({ where: { branchId }, include: { products: true }, orderBy: { name: 'asc' } });
}

export async function createSupplier(data: CreateSupplierInput) {
  return prisma.supplier.create({ data });
}

export async function updateSupplier(id: string, data: Partial<CreateSupplierInput>) {
  return prisma.supplier.update({ where: { id }, data });
}

export async function deleteSupplier(id: string) {
  return prisma.supplier.delete({ where: { id } });
}

// ── Products ──────────────────────────────────────────────────────────────────

export async function createProduct(data: CreateProductInput) {
  return prisma.supplierProduct.create({ data });
}

export async function updateProduct(id: string, data: Partial<CreateProductInput>) {
  return prisma.supplierProduct.update({ where: { id }, data });
}

export async function deleteProduct(id: string) {
  return prisma.supplierProduct.delete({ where: { id } });
}

// ── Order checklist ───────────────────────────────────────────────────────────

export async function getOrderChecklist(supplierId: string, branchId: string) {
  const products = await prisma.supplierProduct.findMany({
    where: { supplierId },
    include: { stockLevels: { where: { branchId } } },
  });

  return products.map(p => {
    const stock = p.stockLevels[0];
    const currentStock = stock ? Number(stock.currentStock) : 0;
    const parLevel = stock ? Number(stock.parLevel) : 0;
    const suggestedQuantity = Math.max(parLevel - currentStock, 0);
    return {
      supplierProductId: p.id,
      name: p.name,
      unit: p.unit,
      pricePerUnit: p.pricePerUnit,
      minOrderQuantity: Number(p.minOrderQuantity),
      currentStock,
      parLevel,
      suggestedQuantity,
    };
  });
}

// ── Create order ──────────────────────────────────────────────────────────────

export async function createOrder(data: CreateOrderInput, createdBy: string) {
  const checklist = await getOrderChecklist(data.supplierId, data.branchId);
  const checklistIds = new Set(checklist.map(c => c.supplierProductId));

  // Validate all checklist products have a quantity
  const orderedIds = new Set(data.items.map(i => i.supplierProductId));
  const missing = checklist.filter(c => !orderedIds.has(c.supplierProductId) && c.suggestedQuantity > 0);
  if (missing.length > 0) {
    throw Object.assign(
      new Error(`Missing quantities for products: ${missing.map(m => m.name).join(', ')}`),
      { statusCode: 422 },
    );
  }

  const suggestedMap = new Map(checklist.map(c => [c.supplierProductId, c.suggestedQuantity]));

  return prisma.distributorOrder.create({
    data: {
      branchId: data.branchId,
      supplierId: data.supplierId,
      createdBy,
      items: {
        create: data.items.map(i => ({
          supplierProductId: i.supplierProductId,
          suggestedQuantity: suggestedMap.get(i.supplierProductId) ?? 0,
          orderedQuantity: i.orderedQuantity,
        })),
      },
    },
    include: { items: { include: { supplierProduct: true } }, supplier: true },
  });
}

// ── Submit order ──────────────────────────────────────────────────────────────

export async function submitOrder(id: string) {
  const order = await prisma.distributorOrder.findUnique({
    where: { id },
    include: { items: { include: { supplierProduct: true } }, supplier: true },
  });
  if (!order) throw Object.assign(new Error('Order not found'), { statusCode: 404 });
  if (order.status !== 'draft') throw Object.assign(new Error('Only draft orders can be submitted'), { statusCode: 409 });

  const updated = await prisma.distributorOrder.update({
    where: { id },
    data: { status: 'submitted', submittedAt: new Date() },
    include: { items: { include: { supplierProduct: true } }, supplier: true },
  });

  const itemLines = updated.items.map(i =>
    `- ${i.supplierProduct.name}: ${i.orderedQuantity} ${i.supplierProduct.unit}`
  ).join('\n');

  sendMail(
    order.supplier.email,
    `Bestelling van Podomoro — #${id.slice(0, 8)}`,
    `<pre>Nieuwe bestelling ontvangen:\n\n${itemLines}\n\nMet vriendelijke groet,\nPodomoro</pre>`,
  ).catch((err) => console.error('[distributors] order email failed:', err.message));

  return updated;
}

// ── Receive order ─────────────────────────────────────────────────────────────

export async function receiveOrder(id: string, data: ReceiveOrderInput) {
  const order = await prisma.distributorOrder.findUnique({ where: { id }, include: { items: true } });
  if (!order) throw Object.assign(new Error('Order not found'), { statusCode: 404 });
  if (order.status !== 'submitted') throw Object.assign(new Error('Only submitted orders can be received'), { statusCode: 409 });

  await prisma.$transaction(
    data.items.map(item => {
      const ordered = order.items.find(i => i.id === item.id);
      const discrepancyFlagged = ordered
        ? Math.abs(Number(ordered.orderedQuantity) - item.receivedQuantity) > 0.001
        : false;

      return prisma.distributorOrderItem.update({
        where: { id: item.id },
        data: { receivedQuantity: item.receivedQuantity, discrepancyFlagged },
      });
    }),
  );

  return prisma.distributorOrder.update({
    where: { id },
    data: { status: 'received', receivedAt: new Date() },
    include: { items: { include: { supplierProduct: true } } },
  });
}

// ── Order history ─────────────────────────────────────────────────────────────

export async function listOrders(branchId: string, supplierId?: string) {
  return prisma.distributorOrder.findMany({
    where: { branchId, ...(supplierId && { supplierId }) },
    include: { supplier: true, items: { include: { supplierProduct: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

// ── Stock ─────────────────────────────────────────────────────────────────────

export async function updateStock(id: string, data: { currentStock: number; parLevel?: number }) {
  return prisma.stockLevel.update({ where: { id }, data });
}

// ── Low stock check (used by cron) ────────────────────────────────────────────

export async function getLowStockItems() {
  const stocks = await prisma.stockLevel.findMany({
    include: { supplierProduct: true, branch: { select: { name: true } } },
  });
  return stocks.filter(s => Number(s.currentStock) < Number(s.parLevel));
}
