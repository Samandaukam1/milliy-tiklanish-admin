import { Header } from '@/components/header';
import { User, Bell, Lock, Globe, Database } from 'lucide-react';
import SocialLinksSection from './social-links-section';

export default function SettingsPage() {
  return (
    <div className="flex flex-col h-full">
      <Header
        title="Sozlamalar"
        subtitle="Panel va tizim sozlamalarini boshqaring"
      />

      <div className="flex-1 p-8 space-y-6">
        {/* Profile Settings */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <User size={20} className="text-slate-600" />
            <h2 className="text-lg font-bold text-slate-900">Profil Sozlamalari</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                To&apos;liq ism
              </label>
              <input
                type="text"
                defaultValue="Admin"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
              <input
                type="email"
                defaultValue="admin@milliy.uz"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
            Saqlash
          </button>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Bell size={20} className="text-slate-600" />
            <h2 className="text-lg font-bold text-slate-900">Bildirishnomalar</h2>
          </div>
          <div className="space-y-4">
            {[
              { label: 'Yangi maqola bildirishnomalari', key: 'articles' },
              { label: 'Foydalanuvchi ro\'yxatdan o\'tishi', key: 'users' },
              { label: 'Tizim xabarlari', key: 'system' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-b-0">
                <span className="text-sm text-slate-700">{item.label}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Security */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Lock size={20} className="text-slate-600" />
            <h2 className="text-lg font-bold text-slate-900">Xavfsizlik</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Joriy parol
              </label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Yangi parol
              </label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
            Parolni yangilash
          </button>
        </div>

        {/* Language */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Globe size={20} className="text-slate-600" />
            <h2 className="text-lg font-bold text-slate-900">Til Sozlamalari</h2>
          </div>
          <div className="max-w-xs">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Panel tili
            </label>
            <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="uz">O&apos;zbekcha (Lotin)</option>
              <option value="uz_cy">O&apos;zbekcha (Kirill)</option>
              <option value="ru">Ruscha</option>
              <option value="en">English</option>
            </select>
          </div>
          <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
            Saqlash
          </button>
        </div>

        {/* Social Links */}
        <SocialLinksSection />

        {/* Database / Supabase Info */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Database size={20} className="text-slate-600" />
            <h2 className="text-lg font-bold text-slate-900">Ma&apos;lumotlar Bazasi</h2>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-slate-600">Supabase holati</span>
              <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 font-medium">
                Ulangan
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-slate-600">Ma&apos;lumotlar bazasi versiyasi</span>
              <span className="text-slate-900 font-medium">PostgreSQL 15</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-slate-600">Supabase SDK versiyasi</span>
              <span className="text-slate-900 font-medium">2.x</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
