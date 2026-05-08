import { NavLink } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import type { Role } from '@/types';

interface NavItem { label: string; to: string; roles: Role[] }

const NAV: NavItem[] = [
  { label: '📊 Dashboard', to: '/dashboard', roles: ['owner', 'partner'] },
  { label: '🖥️ Kassa', to: '/kassa', roles: ['cashier', 'manager', 'owner'] },
  { label: '👥 Rooster', to: '/rooster', roles: ['manager', 'staff', 'owner'] },
  { label: '💰 Financieel', to: '/financieel', roles: ['owner', 'boekhouder'] },
  { label: '🗑️ Afval', to: '/waste', roles: ['staff', 'manager', 'owner'] },
  { label: '⭐ Reviews', to: '/reviews', roles: ['owner', 'partner', 'manager'] },
];

interface Props { onClose?: () => void }

export default function Sidebar({ onClose }: Props) {
  const { user, logout } = useAuth();
  const visibleNav = NAV.filter(n => user && n.roles.includes(user.role));

  return (
    <div className="flex flex-col h-full bg-secondary text-white w-56">
      <div className="px-5 py-4 border-b border-white/10">
        <span className="text-xl font-bold text-primary">Podomoro</span>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        {visibleNav.map(n => (
          <NavLink
            key={n.to}
            to={n.to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center px-5 py-3 text-sm font-medium transition-colors
              ${isActive ? 'bg-white/10 text-white border-r-2 border-primary' : 'text-white/70 hover:bg-white/5 hover:text-white'}`
            }
          >
            {n.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-white/10">
        <p className="text-xs text-white/50 mb-1 truncate">{user?.email}</p>
        <p className="text-xs text-white/40 capitalize mb-3">{user?.role}</p>
        <button
          onClick={() => logout()}
          className="text-sm text-white/70 hover:text-white transition-colors"
        >
          Uitloggen →
        </button>
      </div>
    </div>
  );
}
