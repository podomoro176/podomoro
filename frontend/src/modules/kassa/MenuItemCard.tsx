import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import type { MenuItem } from '@/types';

interface Props { item: MenuItem; onAdd: (item: MenuItem) => void }

export default function MenuItemCard({ item, onAdd }: Props) {
  const { formatEur } = useCurrencyFormat();

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm flex flex-col gap-2">
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-secondary text-sm leading-tight truncate">{item.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">{item.category}</p>
        </div>
        {item.allergens.length > 0 && (
          <span className="shrink-0 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
            ⚠️ {item.allergens.length}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mt-auto">
        <span className="font-bold text-primary">{formatEur(item.price)}</span>
        <button
          onClick={() => onAdd(item)}
          className="touch-min w-10 h-10 rounded-lg bg-primary text-white text-xl font-bold hover:bg-primary/90 active:scale-95 transition-all flex items-center justify-center"
          aria-label={`Voeg ${item.name} toe`}
        >
          +
        </button>
      </div>
    </div>
  );
}
