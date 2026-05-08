import bcrypt from 'bcryptjs';
import prisma from '../../lib/prisma';
import { emitToRoom } from '../../lib/socket';
import { recordTransaction } from './finance.stub';
import {
  CreateOrderInput, UpdateOrderInput, PaymentInput, DiscountInput, AllergenConfirmInput,
} from './pos.schema';
import { OrderStatus, PaymentStatus } from '@prisma/client';

// ── Order number ──────────────────────────────────────────────────────────────

async function nextOrderNumber(branchId: string): Promise<number> {
  const result = await prisma.order.aggregate({
    where: { branchId },
    _max: { orderNumber: true },
  });
  return (result._max.orderNumber ?? 0) + 1;
}

// ── Orders ────────────────────────────────────────────────────────────────────

export async function createOrder(data: CreateOrderInput, cashierId: string) {
  const orderNumber = await nextOrderNumber(data.branchId);
  return prisma.order.create({
    data: {
      branchId: data.branchId,
      orderNumber,
      source: data.source,
      tableNumber: data.tableNumber,
      isTakeaway: data.isTakeaway,
      notes: data.notes,
      cashierId,
    },
    include: { items: { include: { menuItem: true } } },
  });
}

export async function getOrder(id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: { items: { include: { menuItem: true } }, transactions: true },
  });
}

export async function listOrders(branchId: string, page: number, limit: number) {
  const skip = (page - 1) * limit;
  const [orders, total] = await prisma.$transaction([
    prisma.order.findMany({
      where: { branchId },
      skip, take: limit,
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    }),
    prisma.order.count({ where: { branchId } }),
  ]);
  return { orders, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function updateOrder(id: string, data: UpdateOrderInput, cashierId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) throw Object.assign(new Error('Order not found'), { statusCode: 404 });

    if (data.items && data.items.length > 0) {
      const menuItems = await tx.menuItem.findMany({
        where: { id: { in: data.items.map(i => i.menuItemId) }, isAvailable: true },
      });
      const priceMap = new Map(menuItems.map(m => [m.id, m.price]));

      for (const item of data.items) {
        const price = priceMap.get(item.menuItemId);
        if (!price) throw Object.assign(new Error(`Menu item ${item.menuItemId} not found or unavailable`), { statusCode: 422 });
        await tx.orderItem.create({
          data: { orderId: id, menuItemId: item.menuItemId, quantity: item.quantity, unitPrice: price, notes: item.notes },
        });
      }

      const allItems = await tx.orderItem.findMany({ where: { orderId: id } });
      const newTotal = allItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
      await tx.order.update({ where: { id }, data: { totalAmount: newTotal } });
    }

    return tx.order.update({
      where: { id },
      data: {
        ...(data.status && { status: data.status as OrderStatus }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
      include: { items: { include: { menuItem: true } } },
    });
  });
}

// ── Payment ───────────────────────────────────────────────────────────────────

export async function processPayment(orderId: string, data: PaymentInput, cashierId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw Object.assign(new Error('Order not found'), { statusCode: 404 });
  if (order.paymentStatus === PaymentStatus.paid) {
    throw Object.assign(new Error('Order already paid'), { statusCode: 409 });
  }

  let change: number | undefined;
  if (data.paymentMethod === 'cash') {
    if (!data.cashGiven) throw Object.assign(new Error('cashGiven required for cash payments'), { statusCode: 422 });
    if (data.cashGiven < order.totalAmount) throw Object.assign(new Error('Insufficient cash given'), { statusCode: 422 });
    change = data.cashGiven - order.totalAmount;
  }

  const [transaction, updatedOrder] = await prisma.$transaction([
    prisma.transaction.create({
      data: {
        orderId,
        branchId: order.branchId,
        amount: order.totalAmount,
        paymentMethod: data.paymentMethod,
        cashierId,
      },
    }),
    prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: PaymentStatus.paid, status: OrderStatus.completed, paymentMethod: data.paymentMethod },
    }),
  ]);

  await recordTransaction({
    orderId,
    branchId: order.branchId,
    amount: order.totalAmount,
    paymentMethod: data.paymentMethod,
    cashierId,
  });

  emitToRoom('owner:live-feed', 'order:completed', { order: updatedOrder });

  return { transaction, order: updatedOrder, change };
}

// ── Discount ──────────────────────────────────────────────────────────────────

export async function applyDiscount(orderId: string, data: DiscountInput) {
  const manager = await prisma.user.findUnique({ where: { id: data.managerId } });
  if (!manager || manager.role !== 'manager') {
    throw Object.assign(new Error('Manager not found'), { statusCode: 404 });
  }

  const pinValid = await bcrypt.compare(data.managerPin, manager.passwordHash);
  if (!pinValid) throw Object.assign(new Error('Invalid manager PIN'), { statusCode: 401 });

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw Object.assign(new Error('Order not found'), { statusCode: 404 });

  let discountedTotal: number;
  if (data.discountType === 'percentage') {
    discountedTotal = Math.round(order.totalAmount * (1 - data.discountAmount / 100));
  } else {
    discountedTotal = Math.max(order.totalAmount - data.discountAmount, 0);
  }

  return prisma.order.update({
    where: { id: orderId },
    data: {
      discountType: data.discountType,
      discountAmount: data.discountAmount,
      discountAppliedBy: data.managerId,
      totalAmount: discountedTotal,
    },
  });
}

// ── Allergens ─────────────────────────────────────────────────────────────────

export async function getAllergens(menuItemId: string) {
  const item = await prisma.menuItem.findUnique({
    where: { id: menuItemId },
    select: { id: true, name: true, allergens: true },
  });
  if (!item) throw Object.assign(new Error('Menu item not found'), { statusCode: 404 });
  return item;
}

export async function confirmAllergens(data: AllergenConfirmInput, userId: string) {
  return prisma.allergenLog.create({
    data: {
      orderId: data.orderId,
      itemId: data.menuItemId,
      allergensShown: data.allergensShown,
      confirmedBy: userId,
    },
  });
}

// ── Tables ────────────────────────────────────────────────────────────────────

export async function getTables(branchId: string) {
  return prisma.restaurantTable.findMany({
    where: { branchId },
    orderBy: { tableNumber: 'asc' },
    include: { order: { select: { id: true, status: true, orderNumber: true } } },
  });
}

export async function updateTable(id: string, data: { status: 'free' | 'occupied' | 'reserved'; currentOrderId?: string | null }) {
  return prisma.restaurantTable.update({ where: { id }, data });
}

// ── Menu search ───────────────────────────────────────────────────────────────

export async function searchMenu(query: { q?: string; category?: string; branchId?: string; page: number; limit: number }) {
  const { q, category, branchId, page, limit } = query;
  const skip = (page - 1) * limit;

  const where = {
    isAvailable: true,
    ...(branchId && { branchId }),
    ...(category && { category }),
    ...(q && { name: { contains: q, mode: 'insensitive' as const } }),
  };

  const [items, total] = await prisma.$transaction([
    prisma.menuItem.findMany({ where, skip, take: limit, orderBy: { category: 'asc' } }),
    prisma.menuItem.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}
