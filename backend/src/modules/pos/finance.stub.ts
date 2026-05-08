import { PaymentMethod } from '@prisma/client';

export interface TransactionRecord {
  orderId: string;
  branchId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  cashierId?: string;
  stripePaymentIntentId?: string;
}

/**
 * Stub replaced by the real finance service in Phase 3 (Step 12).
 * Called on every completed POS/online transaction.
 */
export async function recordTransaction(_record: TransactionRecord): Promise<void> {
  // Phase 3 will write this to finance tables and update KPIs
}
