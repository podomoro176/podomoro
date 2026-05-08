import { useEffect, useState, useCallback } from 'react';
import { getPosMenu } from '@/api/menu';
import { useAuth } from '@/context/AuthContext';
import Spinner from '@/components/Spinner';
import MenuItemCard from './MenuItemCard';
import type { MenuItem } from '@/types';

interface Props { onAdd: (item: MenuItem) => void }

export default function MenuPanel({ onAdd }: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMenu = useCallback(() => {
    setLoading(true);
    getPosMenu({ branchId: user?.branchId ?? undefined, q: search || undefined, category: category ?? undefined })
      .then(result => {
        setItems(result.items);
        if (!category) {
          const cats = [...new Set(result.items.map(i => i.category))].sort();
          setCategories(cats);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.branchId, search, category]);

  useEffect(() => {
    const t = setTimeout(fetchMenu, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [fetchMenu, search]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b bg-white space-y-2">
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Zoek gerecht..."
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setCategory(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${!category ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Alles
          </button>
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c === category ? null : c)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize ${category === c ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : items.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">Geen gerechten gevonden</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {items.map(item => <MenuItemCard key={item.id} item={item} onAdd={onAdd} />)}
          </div>
        )}
      </div>
    </div>
  );
}
