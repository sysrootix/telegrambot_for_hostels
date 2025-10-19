import { NavLink } from 'react-router-dom';

import { useSession } from '@/providers/SessionProvider';

const baseClasses =
  'flex-1 rounded-xl py-3 text-center text-sm font-medium transition-colors duration-150';

export function Navigation() {
  const { session } = useSession();

  const items = [
    { to: '/', label: 'Профиль', adminOnly: false },
    { to: '/admin', label: 'Админка', adminOnly: true }
  ];

  return (
    <nav className="flex gap-2">
      {items
        .filter((item) => !item.adminOnly || session?.isAdmin)
        .map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              [
                baseClasses,
                isActive ? 'bg-tgButton text-tgButtonText' : 'bg-white/5 text-tgText'
              ].join(' ')
            }
          >
            {item.label}
          </NavLink>
        ))}
    </nav>
  );
}
