import Stripe from 'stripe';
import prisma from '../../lib/prisma';
import { emitToRoom } from '../../lib/socket';
import { sendMail } from '../../lib/mailer';
import { recordTransaction } from '../pos/finance.stub';
import { CheckoutInput, ReservationInput } from './online.schema';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2025-02-24.acacia',
});

// ── Menu (public) ──────────────────────────────────────────────────────────────

export async function getOnlineMenu(branchId?: string, page = 1, limit = 50) {
  const skip = (page - 1) * limit;
  const where = { isAvailable: true, ...(branchId && { branchId }) };
  const [items, total] = await prisma.$transaction([
    prisma.menuItem.findMany({ where, skip, take: limit, orderBy: { category: 'asc' } }),
    prisma.menuItem.count({ where }),
  ]);
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

// ── Cart validation ────────────────────────────────────────────────────────────

export async function validateCart(items: Array<{ menuItemId: string; quantity: number }>) {
  const ids = items.map(i => i.menuItemId);
  const menuItems = await prisma.menuItem.findMany({ where: { id: { in: ids }, isAvailable: true } });
  const found = new Set(menuItems.map(m => m.id));
  const missing = ids.filter(id => !found.has(id));
  if (missing.length > 0) throw Object.assign(new Error(`Items not available: ${missing.join(', ')}`), { statusCode: 422 });

  const priceMap = new Map(menuItems.map(m => [m.id, m.price]));
  const total = items.reduce((sum, i) => sum + (priceMap.get(i.menuItemId) ?? 0) * i.quantity, 0);
  return { items: menuItems, total };
}

// ── Checkout / Stripe ─────────────────────────────────────────────────────────

export async function createCheckout(data: CheckoutInput) {
  const { total } = await validateCart(data.items);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: total,
    currency: 'eur',
    metadata: {
      branchId: data.branchId,
      customerEmail: data.customerEmail,
      customerName: data.customerName,
      isTakeaway: String(data.isTakeaway),
      items: JSON.stringify(data.items),
      notes: data.notes || '',
    },
  });

  return { clientSecret: paymentIntent.client_secret, amount: total };
}

// ── Stripe webhook ─────────────────────────────────────────────────────────────

export async function handleStripeWebhook(rawBody: Buffer, signature: string) {
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET || '');
  } catch {
    throw Object.assign(new Error('Invalid Stripe signature'), { statusCode: 400 });
  }

  if (event.type !== 'payment_intent.succeeded') return { received: true };

  const intent = event.data.object as Stripe.PaymentIntent;
  const { branchId, customerEmail, customerName, isTakeaway, items: itemsJson, notes } = intent.metadata;

  const parsedItems: Array<{ menuItemId: string; quantity: number; notes?: string }> = JSON.parse(itemsJson || '[]');

  const menuItems = await prisma.menuItem.findMany({ where: { id: { in: parsedItems.map(i => i.menuItemId) } } });
  const priceMap = new Map(menuItems.map(m => [m.id, m.price]));

  const maxResult = await prisma.order.aggregate({ where: { branchId }, _max: { orderNumber: true } });
  const orderNumber = (maxResult._max.orderNumber ?? 0) + 1;

  const order = await prisma.order.create({
    data: {
      branchId,
      orderNumber,
      source: 'online',
      isTakeaway: isTakeaway === 'true',
      paymentStatus: 'paid',
      paymentMethod: 'online',
      status: 'pending',
      notes: notes || undefined,
      totalAmount: intent.amount,
      items: {
        create: parsedItems.map(i => ({
          menuItemId: i.menuItemId,
          quantity: i.quantity,
          unitPrice: priceMap.get(i.menuItemId) ?? 0,
          notes: i.notes,
        })),
      },
    },
    include: { items: true },
  });

  await prisma.transaction.create({
    data: {
      orderId: order.id,
      branchId,
      amount: intent.amount,
      paymentMethod: 'online',
      stripePaymentIntentId: intent.id,
    },
  });

  await recordTransaction({ orderId: order.id, branchId, amount: intent.amount, paymentMethod: 'online' });

  // Upsert customer
  await prisma.customer.upsert({
    where: { email: customerEmail },
    create: { email: customerEmail, name: customerName, visitCount: 1, lastVisit: new Date(), totalSpent: intent.amount },
    update: { visitCount: { increment: 1 }, lastVisit: new Date(), totalSpent: { increment: intent.amount } },
  });

  // Notify POS
  emitToRoom(`branch:${branchId}:pos`, 'order:new', { order });
  emitToRoom('owner:live-feed', 'order:new', { order });

  // Confirmation email — fire-and-forget so a Resend error doesn't abort the order
  sendMail(customerEmail, 'Bestellingsbevestiging — Podomoro', confirmationEmailHtml(order.orderNumber, intent.amount))
    .catch((err) => console.error('[online] confirmation email failed:', err.message));

  return { received: true, orderId: order.id };
}

function confirmationEmailHtml(orderNumber: number, amountCents: number): string {
  const amount = (amountCents / 100).toLocaleString('nl-NL', { style: 'currency', currency: 'EUR' });
  return `
    <div style="font-family:Inter,sans-serif;max-width:500px;margin:auto;">
      <h2 style="color:#C8371A;">Bedankt voor uw bestelling!</h2>
      <p>Bestelnummer: <strong>#${orderNumber}</strong></p>
      <p>Totaal: <strong>${amount}</strong></p>
      <p>Wij gaan direct aan de slag met uw bestelling.</p>
      <hr/>
      <small style="color:#666;">Podomoro Restaurant</small>
    </div>
  `;
}

// ── Order status ──────────────────────────────────────────────────────────────

export async function getOrderStatus(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, orderNumber: true, updatedAt: true },
  });
  if (!order) throw Object.assign(new Error('Order not found'), { statusCode: 404 });
  return order;
}

// ── Reservations ──────────────────────────────────────────────────────────────

export async function createReservation(data: ReservationInput) {
  sendMail(data.email, 'Reserveringsbevestiging — Podomoro', reservationEmailHtml(data))
    .catch((err) => console.error('[online] reservation email failed:', err.message));
  return { reserved: true, ...data };
}

function reservationEmailHtml(data: ReservationInput): string {
  return `
    <div style="font-family:Inter,sans-serif;max-width:500px;margin:auto;">
      <h2 style="color:#C8371A;">Uw reservering is bevestigd!</h2>
      <p>Naam: <strong>${data.name}</strong></p>
      <p>Datum: <strong>${data.date}</strong> om <strong>${data.time}</strong></p>
      <p>Aantal personen: <strong>${data.partySize}</strong></p>
      ${data.notes ? `<p>Opmerkingen: ${data.notes}</p>` : ''}
      <hr/>
      <small style="color:#666;">Podomoro Restaurant</small>
    </div>
  `;
}
