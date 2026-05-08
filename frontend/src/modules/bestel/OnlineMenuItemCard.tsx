import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import type { MenuItem, AllergenName } from '@/types';

const ALLERGEN_LABELS: Record<AllergenName, string> = {
  gluten: 'Gluten', schaaldieren: 'Schaaldieren', eieren: 'Eieren', vis: 'Vis',
  pinda: 'Pinda', soja: 'Soja', melk: 'Melk', noten: 'Noten',
  selderij: 'Selderij', mosterd: 'Mosterd', sesam: 'Sesam', sulfieten: 'Sulfieten',
  lupine: 'Lupine', weekdieren: 'Weekdieren',
};

interface Props {
  item: MenuItem;
  hiddenAllergens: AllergenName[];
  onAdd: (item: MenuItem) => void;
}

export default function OnlineMenuItemCard({ item, hiddenAllergens, onAdd }: Props) {
  const { formatEur } = useCurrencyFormat();
  const isHidden = item.allergens.some(a => hiddenAllergens.includes(a));

  if (isHidden) return null;

  return (
    <div className="bg-white rounded-xl border hover:shadow-md transition-shadow flex flex-col">
      {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="w-full h-36 object-cover rounded-t-xl" />}
      <div className="p-3 flex flex-col flex-1">
        <p className="font-semibold text-secondary text-sm">{item.name}</p>
        {item.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 flex-1">{item.description}</p>}
        {item.allergens.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {item.allergens.map(a => (
              <span key={a} className="bg-warning/10 text-warning text-xs px-1.5 py-0.5 rounded-full">
                {ALLERGEN_LABELS[a]}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between mt-3">
          <span className="font-bold text-primary">{formatEur(item.price)}</span>
          <button
            onClick={() => onAdd(item)}
            className="px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 min-h-[44px]"
          >
            + Toevoegen
          </button>
        </div>
      </div>
    </div>
  );
}
