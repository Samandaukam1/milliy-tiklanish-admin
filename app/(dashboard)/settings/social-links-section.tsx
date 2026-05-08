'use client';

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Image as ImageIcon, Send, Globe, Save } from 'lucide-react';
import { useEffect, useState } from 'react';

const SOCIAL_KEYS = [
  { key: 'instagram_url', label: 'Instagram', icon: ImageIcon, placeholder: 'https://instagram.com/...' },
  { key: 'telegram_url', label: 'Telegram', icon: Send, placeholder: 'https://t.me/...' },
  { key: 'facebook_url', label: 'Facebook', icon: Globe, placeholder: 'https://facebook.com/...' },
] as const;

export default function SocialLinksSection() {
  const [values, setValues] = useState<Record<string, string>>({
    instagram_url: '',
    telegram_url: '',
    facebook_url: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    supabase
      .from('site_settings')
      .select('key, value')
      .in('key', ['instagram_url', 'telegram_url', 'facebook_url'])
      .then(({ data }) => {
        if (data) {
          const map: Record<string, string> = {};
          data.forEach((row) => { map[row.key] = row.value; });
          setValues((prev) => ({ ...prev, ...map }));
        }
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    if (isSupabaseConfigured()) {
      await Promise.all(
        SOCIAL_KEYS.map(({ key }) =>
          supabase
            .from('site_settings')
            .upsert({ key, value: values[key] ?? '' }, { onConflict: 'key' })
        )
      );
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <ImageIcon size={20} className="text-slate-600" />
        <h2 className="text-lg font-bold text-slate-900">Ijtimoiy tarmoqlar</h2>
      </div>
      <div className="space-y-4 max-w-md">
        {SOCIAL_KEYS.map(({ key, label, icon: Icon, placeholder }) => (
          <div key={key}>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1">
              <Icon size={14} />
              {label}
            </label>
            <input
              type="url"
              value={values[key]}
              onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.value }))}
              placeholder={placeholder}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm disabled:opacity-50"
        >
          <Save size={14} />
          {saving ? 'Saqlanmoqda...' : 'Saqlash'}
        </button>
        {saved && <span className="text-sm text-green-600 font-medium">Saqlandi ✓</span>}
      </div>
    </div>
  );
}
