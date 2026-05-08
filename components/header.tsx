'use client';

import { Globe, User, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const [language, setLanguage] = useState<'uz' | 'ru' | 'en'>('uz');
  const { user, signOut } = useAuth();

  const displayName = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'Admin';
  const displayEmail = user?.email ?? 'admin@example.com';

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8">
      {/* Left: Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-6">
        {/* Language Switcher */}
        <div className="flex items-center gap-2">
          <Globe size={20} className="text-slate-600" />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'uz' | 'ru' | 'en')}
            className="px-3 py-1 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="uz">UZ</option>
            <option value="ru">RU</option>
            <option value="en">EN</option>
          </select>
        </div>

        {/* Profile + Logout */}
        <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <User size={20} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900 capitalize">{displayName}</p>
            <p className="text-xs text-slate-500">{displayEmail}</p>
          </div>
          <button
            onClick={signOut}
            title="Chiqish"
            className="ml-1 p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
