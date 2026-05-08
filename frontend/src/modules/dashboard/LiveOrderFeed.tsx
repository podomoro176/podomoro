import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import type { Order, OrderStatus } from '@/types';

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Wachtend', accepted: 'Geaccepteerd', preparing: 'In bereiding',
  ready: 'Klaar', completed: 'Voltooid', cancelled: 'Geannuleerd',
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  accepted: 'bg-blue-100 text-blue-700',
  preparing: 'bg-primary/10 text-primary',
  ready: 'bg-accent/20 text-accent',
  completed: 'bg-success/10 text-success',
  cancelled: 'bg-danger/10 text-danger',
};

interface Props { orders: Order[] }

export default function LiveOrderFeed({ orders }: Props) {
  const { formatEur } = useCurrencyFormat();

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <h3 className="font-semibold text-secondary mb-3">Live bestellingen</h3>
      {orders.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">Geen recente bestellingen</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {orders.map(order => (
            <div key={order.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-secondary">
                  #{order.orderNumber}
                  <span className={`ml-2 inline-block text-xs px-2 py-0.5 rounded-full ${order.source === 'online' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'}`}>
                    {order.source === 'online' ? 'Online' : 'POS'}
                  </span>
                </p>
                {order.branch && <p className="text-xs text-gray-400">{order.branch.name}</p>}
              </div>
              <span className="text-sm font-bold text-primary shrink-0">{formatEur(order.totalAmount)}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[order.status]}`}>
                {STATUS_LABELS[order.status]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
