import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getAllergens } from '@/api/menu';
import { createOrder, updateOrder } from '@/api/pos';
import AllergenModal from '@/components/AllergenModal';
import PaymentModal from '@/components/PaymentModal';
import MenuPanel from './MenuPanel';
import OrderPanel from './OrderPanel';
import IncomingOrdersPanel from './IncomingOrdersPanel';
import type { MenuItem, Order, AllergenName } from '@/types';

interface PendingItem { menuItem: MenuItem; allergens: AllergenName[] }

export default function KassaPage() {
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [pendingItem, setPendingItem] = useState<PendingItem | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);

  async function handleAdd(menuItem: MenuItem) {
    const allergensData = await getAllergens(menuItem.id);
    const allergens = (allergensData.allergens as AllergenName[]) ?? [];

    if (!order) {
      const newOrder = await createOrder({ branchId: user!.branchId!, isTakeaway: true });
      setOrder(newOrder);
      if (allergens.length > 0) {
        setPendingItem({ menuItem, allergens });
        return;
      }
      const updated = await updateOrder(newOrder.id, { items: [{ menuItemId: menuItem.id, quantity: 1 }] });
      setOrder(updated);
      return;
    }

    if (allergens.length > 0) {
      setPendingItem({ menuItem, allergens });
      return;
    }

    await addItemDirectly(menuItem, order);
  }

  async function addItemDirectly(menuItem: MenuItem, currentOrder: Order) {
    const existing = currentOrder.items.find(i => i.menuItemId === menuItem.id);
    const items = currentOrder.items.map(i => ({
      menuItemId: i.menuItemId,
      quantity: i.menuItemId === menuItem.id ? i.quantity + 1 : i.quantity,
    }));
    if (!existing) items.push({ menuItemId: menuItem.id, quantity: 1 });
    const updated = await updateOrder(currentOrder.id, { items });
    setOrder(updated);
  }

  async function handleAllergenConfirm() {
    if (!pendingItem || !order) { setPendingItem(null); return; }
    const items = [...order.items.map(i => ({ menuItemId: i.menuItemId, quantity: i.quantity }))];
    const existing = items.find(i => i.menuItemId === pendingItem.menuItem.id);
    if (existing) existing.quantity += 1;
    else items.push({ menuItemId: pendingItem.menuItem.id, quantity: 1 });
    const updated = await updateOrder(order.id, { items });
    setOrder(updated);
    setPendingItem(null);
  }

  async function handleItemRemove(menuItemId: string) {
    if (!order) return;
    const items = order.items
      .filter(i => i.menuItemId !== menuItemId)
      .map(i => ({ menuItemId: i.menuItemId, quantity: i.quantity }));
    const updated = await updateOrder(order.id, { items });
    setOrder(updated);
  }

  function handlePaymentSuccess(completedOrder: Order) {
    setOrder(null);
    setPaymentOpen(false);
    console.log('Betaling verwerkt:', completedOrder.orderNumber);
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex gap-4 flex-1 min-h-0">
        <div className="flex-1 bg-white rounded-xl overflow-hidden border">
          <MenuPanel onAdd={handleAdd} />
        </div>
        <div className="w-80 bg-white rounded-xl overflow-hidden border flex flex-col">
          <OrderPanel
            order={order}
            onItemRemove={handleItemRemove}
            onPayment={() => setPaymentOpen(true)}
            isManager={user?.role === 'manager' || user?.role === 'owner'}
          />
        </div>
      </div>

      <IncomingOrdersPanel />

      {pendingItem && order && (
        <AllergenModal
          open={true}
          allergens={pendingItem.allergens}
          orderId={order.id}
          menuItemId={pendingItem.menuItem.id}
          onConfirm={handleAllergenConfirm}
        />
      )}

      {order && paymentOpen && (
        <PaymentModal
          open={paymentOpen}
          order={order}
          onClose={() => setPaymentOpen(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
