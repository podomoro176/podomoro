import { useEffect, useState } from 'react';
import { getOnlineMenu } from '@/api/online';
import { useCart } from '@/context/CartContext';
import type { MenuItem, AllergenName } from '@/types';
import MenuGrid from './MenuGrid';
import CartSidebar from './CartSidebar';
import Spinner from '@/components/Spinner';

const ALL_ALLERGENS: { key: AllergenName; label: string }[] = [
  { key: 'gluten', label: 'Gluten' }, { key: 'schaaldieren', label: 'Schaaldieren' },
  { key: 'eieren', label: 'Eieren' }, { key: 'vis', label: 'Vis' },
  { key: 'pinda', label: 'Pinda' }, { key: 'soja', label: 'Soja' },
  { key: 'melk', label: 'Melk' }, { key: 'noten', label: 'Noten' },
  { key: 'selderij', label: 'Selderij' }, { key: 'mosterd', label: 'Mosterd' },
  { key: 'sesam', label: 'Sesam' }, { key: 'sulfieten', label: 'Sulfieten' },
  { key: 'lupine', label: 'Lupine' }, { key: 'weekdieren', label: 'Weekdieren' },
];

export default function BestelPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [hidden, setHidden] = useState<AllergenName[]>([]);
  const { addItem } = useCart();

  useEffect(() => {
    getOnlineMenu({ limit: 200 })
      .then(d => setItems(d.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const categories = Array.from(new Set(items.map(i => i.category).filter(Boolean)));
  const filtered = category ? items.filter(i => i.category === category) : items;

  function toggleAllergen(key: AllergenName) {
    setHidden(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-3">
        <span className="text-primary font-bold text-xl">Podomoro</span>
        <span className="text-gray-400">Online bestellen</span>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-5">
          <details className="bg-white rounded-xl border p-4">
            <summary className="font-medium text-sm cursor-pointer select-none">Allergenenfilter — verberg gerechten met...</summary>
            <div className="flex flex-wrap gap-2 mt-3">
              {ALL_ALLERGENS.map(a => (
                <label key={a.key} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border cursor-pointer select-none transition-colors ${hidden.includes(a.key) ? 'bg-warning/10 border-warning text-warning' : 'bg-gray-50 text-gray-600'}`}>
                  <input type="checkbox" className="sr-only" checked={hidden.includes(a.key)} onChange={() => toggleAllergen(a.key)} />
                  {a.label}
                </label>
              ))}
            </div>
          </details>

          {categories.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setCategory('')} className={`px-3 py-1.5 text-sm rounded-full transition-colors ${category === '' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                Alles
              </button>
              {categories.map(c => (
                <button key={c} onClick={() => setCategory(c)} className={`px-3 py-1.5 text-sm rounded-full transition-colors ${category === c ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {c}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-16"><Spinner /></div>
          ) : (
            <MenuGrid items={filtered} hiddenAllergens={hidden} onAdd={addItem} />
          )}
        </div>

        <div className="w-full lg:w-80 flex-shrink-0">
          <CartSidebar />
        </div>
      </div>
    </div>
  );
}
