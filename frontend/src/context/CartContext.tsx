import { createContext, useContext, useState, ReactNode } from 'react';
import type { CartItem, MenuItem } from '@/types';

interface CartContextValue {
  items: CartItem[];
  addItem: (menuItem: MenuItem, qty?: number) => void;
  removeItem: (menuItemId: string) => void;
  updateQty: (menuItemId: string, qty: number) => void;
  clear: () => void;
  total: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  function addItem(menuItem: MenuItem, qty = 1) {
    setItems(prev => {
      const existing = prev.find(i => i.menuItem.id === menuItem.id);
      if (existing) return prev.map(i => i.menuItem.id === menuItem.id ? { ...i, quantity: i.quantity + qty } : i);
      return [...prev, { menuItem, quantity: qty }];
    });
  }

  function removeItem(menuItemId: string) {
    setItems(prev => prev.filter(i => i.menuItem.id !== menuItemId));
  }

  function updateQty(menuItemId: string, qty: number) {
    if (qty <= 0) { removeItem(menuItemId); return; }
    setItems(prev => prev.map(i => i.menuItem.id === menuItemId ? { ...i, quantity: qty } : i));
  }

  function clear() { setItems([]); }

  const total = items.reduce((sum, i) => sum + i.menuItem.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQty, clear, total }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
