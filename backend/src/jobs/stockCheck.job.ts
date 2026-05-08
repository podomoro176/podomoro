import { getLowStockItems } from '../modules/distributors/distributors.service';

let lastLowStockItems: Awaited<ReturnType<typeof getLowStockItems>> = [];

export function getLastLowStockItems() {
  return lastLowStockItems;
}

export async function checkLowStock(): Promise<void> {
  try {
    lastLowStockItems = await getLowStockItems();
    if (lastLowStockItems.length > 0) {
      console.log(`[stock-check] ${lastLowStockItems.length} items below par level`);
    }
  } catch (err) {
    console.error('[stock-check] Error checking stock:', err);
  }
}
