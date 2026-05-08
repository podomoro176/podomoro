import { useEffect, useState } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import { useAuth } from '@/context/AuthContext';
import type { Order } from '@/types';

export default function IncomingOrdersPanel() {
  const { user } = useAuth();
  const branchId = user?.branchId ?? '';
  const socket = useSocket(`branch:${branchId}:pos`);
  const [orders, setOrders] = useState<Order[]>([]);
  const [open, setOpen] = useState(true);
  const { formatEur } = useCurrencyFormat();

  useEffect(() => {
    function onNewOrder({ order }: { order: Order }) {
      setOrders(prev => [order, ...prev.slice(0, 9)]);
    }
    socket.on('order:new', onNewOrder);
    return () => { socket.off('order:new', onNewOrder); };
  }, [socket]);

  function accept(orderId: string) {
    socket.emit('order:accepted', { orderId });
    setOrders(prev => prev.filter(o => o.id !== orderId));
  }

  function reject(orderId: string) {
    const reason = prompt('Reden voor afwijzing:') ?? '';
    socket.emit('order:rejected', { orderId, reason });
    setOrders(prev => prev.filter(o => o.id !== orderId));
  }

  if (!branchId) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 font-semibold text-secondary hover:bg-gray-50 rounded-xl"
      >
        <span>
          Binnenkomende bestellingen
          {orders.length > 0 && (
            <span className="ml-2 bg-primary text-white text-xs px-2 py-0.5 rounded-full">{orders.length}</span>
          )}
        </span>
        <span>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="divide-y max-h-64 overflow-y-auto">
          {orders.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-4">Geen nieuwe bestellingen</p>
          ) : (
            orders.map(order => (
              <div key={order.id} className="p-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">#{order.orderNumber} — Online bestelling</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {order.items.map(i => `${i.quantity}× ${i.menuItem.name}`).join(', ')}
                  </p>
                  <p className="text-sm font-bold text-primary mt-1">{formatEur(order.totalAmount)}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => accept(order.id)} className="px-3 py-1.5 bg-success text-white text-xs font-semibold rounded-lg touch-min">
                    Accepteren
                  </button>
                  <button onClick={() => reject(order.id)} className="px-3 py-1.5 bg-danger text-white text-xs font-semibold rounded-lg touch-min">
                    Afwijzen
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
