import { useCart } from '@/context/CartContext';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import { useNavigate } from 'react-router-dom';

export default function CartSidebar() {
  const { items, updateQty, removeItem, total } = useCart();
  const { formatEur } = useCurrencyFormat();
  const navigate = useNavigate();

  return (
    <aside className="bg-white rounded-xl border p-4 space-y-4 sticky top-4">
      <h2 className="font-bold text-secondary">Jouw bestelling</h2>

      {items.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">Je winkelwagen is leeg</p>
      ) : (
        <>
          <ul className="space-y-3 max-h-96 overflow-y-auto">
            {items.map(ci => (
              <li key={ci.menuItem.id} className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{ci.menuItem.name}</p>
                  <p className="text-xs text-gray-500">{formatEur(ci.menuItem.price)} / stuk</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => updateQty(ci.menuItem.id, ci.quantity - 1)} className="w-7 h-7 rounded-full border text-sm hover:bg-gray-50 flex items-center justify-center">−</button>
                  <span className="w-6 text-center text-sm font-medium">{ci.quantity}</span>
                  <button onClick={() => updateQty(ci.menuItem.id, ci.quantity + 1)} className="w-7 h-7 rounded-full border text-sm hover:bg-gray-50 flex items-center justify-center">+</button>
                </div>
                <button onClick={() => removeItem(ci.menuItem.id)} className="text-gray-300 hover:text-danger text-xs ml-1">✕</button>
              </li>
            ))}
          </ul>

          <div className="border-t pt-3">
            <div className="flex justify-between font-bold">
              <span>Totaal</span>
              <span className="text-primary">{formatEur(total)}</span>
            </div>
          </div>

          <button
            onClick={() => navigate('/bestel/afrekenen')}
            className="w-full py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 min-h-[44px]"
          >
            Bestellen →
          </button>
        </>
      )}
    </aside>
  );
}
