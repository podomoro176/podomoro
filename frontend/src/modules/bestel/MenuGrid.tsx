import type { MenuItem, AllergenName } from '@/types';
import OnlineMenuItemCard from './OnlineMenuItemCard';

interface Props {
  items: MenuItem[];
  hiddenAllergens: AllergenName[];
  onAdd: (item: MenuItem) => void;
}

export default function MenuGrid({ items, hiddenAllergens, onAdd }: Props) {
  const visible = items.filter(item => !item.allergens.some(a => hiddenAllergens.includes(a)));

  if (visible.length === 0) return <p className="text-center py-12 text-gray-400">Geen gerechten beschikbaar</p>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map(item => (
        <OnlineMenuItemCard key={item.id} item={item} hiddenAllergens={hiddenAllergens} onAdd={onAdd} />
      ))}
    </div>
  );
}
