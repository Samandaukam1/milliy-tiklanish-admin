'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  FolderOpen,
  Image,
  Mic,
  Users,
  Settings,
  LogOut,
  Sparkles,
  Newspaper,
  UserCheck,
  Info,
  Star,
  Inbox,
  Share2,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/lib/auth-context';

const navItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    label: 'Bosh sahifa',
  },
  {
    title: 'Milliy AI',
    href: '/milliy-ai',
    icon: Sparkles,
    label: 'AI Assistant',
  },
  {
    title: 'Maqolalar',
    href: '/articles',
    icon: FileText,
    label: 'Articles',
  },
  {
    title: 'Kategoriyalar',
    href: '/categories',
    icon: FolderOpen,
    label: 'Categories',
  },
  {
    title: 'Media',
    href: '/media',
    icon: Image,
    label: 'Media',
  },
  {
    title: 'Audio',
    href: '/audio',
    icon: Mic,
    label: 'Tahririyat radiosi',
  },
  {
    title: 'Foydalanuvchilar',
    href: '/users',
    icon: Users,
    label: 'Users',
  },
  {
    title: 'Gazeta sonlari',
    href: '/issues',
    icon: Newspaper,
    label: 'Issues',
  },
  {
    title: 'Mualliflar',
    href: '/authors',
    icon: UserCheck,
    label: 'Authors',
  },
  {
    title: 'Tahririyat',
    href: '/editorial',
    icon: Info,
    label: 'Editorial',
  },
  {
    title: 'Tavsiyalar',
    href: '/editorial-recommendations',
    icon: Star,
    label: 'Editorial Recommendations',
  },
  {
    title: "O'quvchi maqolalari",
    href: '/reader-submissions',
    icon: Inbox,
    label: 'Reader Submissions',
  },
  {
    title: 'Ijtimoiy tarmoqlar',
    href: '/social-settings',
    icon: Share2,
    label: 'Social Settings',
  },
  {
    title: 'Sozlamalar',
    href: '/settings',
    icon: Settings,
    label: 'Settings',
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { signOut } = useAuth();

  return (
    <aside className="w-64 h-screen bg-slate-900 text-white border-r border-slate-800 flex flex-col">
      {/* Logo Section */}
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold">Milliy Tiklanish</h1>
        <p className="text-xs text-slate-400 mt-1">Admin Panel</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={clsx(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                    isActive
                      ? item.href === '/milliy-ai'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-blue-600 text-white'
                      : item.href === '/milliy-ai'
                      ? 'text-indigo-300 hover:bg-indigo-900/50 hover:text-indigo-200'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  )}
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={signOut}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-slate-300 hover:bg-red-900/50 hover:text-red-300 transition-colors"
        >
          <LogOut size={20} />
          <span>Chiqish</span>
        </button>
      </div>
    </aside>
  );
}
