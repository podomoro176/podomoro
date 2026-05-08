import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import type { Order } from '@/types';

interface Props {
  order: Order | null;
  onItemRemove: (menuItemId: string) => void;
  onPayment: () => void;
  isManager: boolean;
}

export default function OrderPanel({ order, onItemRemove, onPayment, isManager: _isManager }: Props) {
  const { formatEur } = useCurrencyFormat();
  const items = order?.items ?? [];

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="px-4 py-3 border-b">
        <h2 className="font-bold text-secondary">
          {order ? `Bestelling #${order.orderNumber}` : 'Nieuwe bestelling'}
        </h2>
        {order && (
          <span className={`text-xs px-2 py-0.5 rounded-full ${order.isTakeaway ? 'bg-accent/20 text-accent' : 'bg-blue-100 text-blue-700'}`}>
            {order.isTakeaway ? 'Afhalen' : 'Ter plaatse'}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {items.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">Voeg gerechten toe</p>
        ) : (
          items.map(item => (
            <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-secondary truncate">{item.menuItem.name}</p>
                <p className="text-xs text-gray-400">
                  {item.quantity} × {formatEur(item.unitPrice)}
                </p>
              </div>
              <span className="font-semibold text-sm text-secondary shrink-0">
                {formatEur(item.quantity * item.unitPrice)}
              </span>
              <button
                onClick={() => onItemRemove(item.menuItemId)}
                className="text-danger hover:text-danger/70 text-lg leading-none shrink-0"
                aria-label="Verwijder item"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t space-y-3">
        {order && order.discountAmount > 0 && (
          <div className="flex justify-between text-sm text-success">
            <span>Korting</span>
            <span>- {formatEur(order.discountAmount)}</span>
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className="font-bold text-lg text-secondary">Totaal</span>
          <span className="font-bold text-2xl text-primary">{formatEur(order?.totalAmount ?? 0)}</span>
        </div>

        <button
          onClick={onPayment}
          disabled={!order || items.length === 0}
          className="w-full py-4 bg-primary text-white font-bold text-lg rounded-xl touch-min disabled:opacity-40 hover:bg-primary/90 active:scale-98 transition-all"
        >
          Betalen
        </button>
      </div>
    </div>
  );
}
