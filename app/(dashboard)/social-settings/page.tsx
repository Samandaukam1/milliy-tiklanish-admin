'use client';

import { Header } from '@/components/header';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { SocialSettings } from '@/types';
import {
  Save,
  Send,
  Camera,
  Video,
  ThumbsUp,
  AtSign,
  Music,
  Globe,
  Languages,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';

// ─── helpers ─────────────────────────────────────────────────────────────────

const URL_REGEX = /^(https?:\/\/)[\w\-]+(\.[\w\-]+)+([\w\-.,@?^=%&:/~+#]*[\w\-@?^=%&/~+#])?$/;

function isValidUrl(val: string) {
  return val === '' || URL_REGEX.test(val);
}

// ─── sub-components ──────────────────────────────────────────────────────────

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}

function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
          checked ? 'bg-blue-600' : 'bg-slate-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
      {label && (
        <span className={`text-sm font-medium ${checked ? 'text-slate-900' : 'text-slate-400'}`}>
          {label}
        </span>
      )}
    </label>
  );
}

interface UrlFieldProps {
  icon: React.ReactNode;
  label: string;
  fieldKey: keyof SocialSettings;
  enabledKey: keyof SocialSettings;
  values: SocialSettings;
  errors: Partial<Record<keyof SocialSettings, string>>;
  onChange: (key: keyof SocialSettings, value: string | boolean) => void;
  placeholder: string;
}

function UrlField({ icon, label, fieldKey, enabledKey, values, errors, onChange, placeholder }: UrlFieldProps) {
  const urlValue = values[fieldKey] as string;
  const enabled = values[enabledKey] as boolean;
  const error = errors[fieldKey];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
      <div className="flex flex-col gap-1.5">
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          {icon}
          {label}
        </label>
        <input
          type="url"
          value={urlValue}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          placeholder={placeholder}
          className={`w-full px-3 py-2 border rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 transition-colors ${
            error
              ? 'border-red-400 focus:ring-red-400'
              : 'border-slate-300 focus:ring-blue-500'
          }`}
        />
        {error && (
          <p className="flex items-center gap-1 text-xs text-red-600">
            <AlertCircle size={12} />
            {error}
          </p>
        )}
      </div>
      <div className="flex sm:flex-col items-start sm:items-end justify-between sm:justify-center gap-2 sm:pt-6">
        <Toggle
          checked={enabled}
          onChange={(v) => onChange(enabledKey, v)}
          label={enabled ? "Yoqilgan" : "O'chirilgan"}
        />
      </div>
    </div>
  );
}

// ─── default form state ───────────────────────────────────────────────────────

const DEFAULT: Omit<SocialSettings, 'id' | 'updated_at'> = {
  title_uz: "Biz bilan bo'ling",
  title_ru: 'Будьте с нами',
  title_en: 'Stay with us',
  telegram_url: '',
  instagram_url: '',
  youtube_url: '',
  facebook_url: '',
  twitter_url: '',
  tiktok_url: '',
  telegram_enabled: true,
  instagram_enabled: true,
  youtube_enabled: true,
  facebook_enabled: false,
  twitter_enabled: false,
  tiktok_enabled: false,
};

// ─── main page ────────────────────────────────────────────────────────────────

export default function SocialSettingsPage() {
  const [form, setForm] = useState<SocialSettings>({ id: '', updated_at: '', ...DEFAULT });
  const [errors, setErrors] = useState<Partial<Record<keyof SocialSettings, string>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // ── fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    supabase
      .from('social_settings')
      .select('*')
      .limit(1)
      .single()
      .then(({ data, error }) => {
        if (data && !error) setForm(data as SocialSettings);
        setLoading(false);
      });
  }, []);

  // ── handlers ───────────────────────────────────────────────────────────────
  const handleChange = (key: keyof SocialSettings, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (typeof value === 'string' && errors[key]) {
      setErrors((prev) => { const next = { ...prev }; delete next[key]; return next; });
    }
  };

  const validate = (): boolean => {
    const urlFields: Array<keyof SocialSettings> = [
      'telegram_url', 'instagram_url', 'youtube_url',
      'facebook_url', 'twitter_url', 'tiktok_url',
    ];
    const next: Partial<Record<keyof SocialSettings, string>> = {};
    for (const f of urlFields) {
      if (!isValidUrl(form[f] as string)) {
        next[f] = "To'g'ri URL kiriting (https:// bilan boshlang)";
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        title_uz: form.title_uz,
        title_ru: form.title_ru,
        title_en: form.title_en,
        telegram_url: form.telegram_url,
        instagram_url: form.instagram_url,
        youtube_url: form.youtube_url,
        facebook_url: form.facebook_url,
        twitter_url: form.twitter_url,
        tiktok_url: form.tiktok_url,
        telegram_enabled: form.telegram_enabled,
        instagram_enabled: form.instagram_enabled,
        youtube_enabled: form.youtube_enabled,
        facebook_enabled: form.facebook_enabled,
        twitter_enabled: form.twitter_enabled,
        tiktok_enabled: form.tiktok_enabled,
        updated_at: new Date().toISOString(),
      };

      if (!isSupabaseConfigured()) {
        // Demo mode — simulate save
        setForm((prev) => ({ ...prev, ...payload }));
        showToast('success', 'Sozlamalar saqlandi (demo rejim)');
        return;
      }

      if (form.id) {
        const { error } = await supabase.from('social_settings').update(payload).eq('id', form.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('social_settings').insert([payload]).select().single();
        if (error) throw error;
        if (data) setForm(data as SocialSettings);
      }
      showToast('success', 'Sozlamalar muvaffaqiyatli saqlandi');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Xatolik yuz berdi';
      showToast('error', message);
    } finally {
      setSaving(false);
    }
  };

  // ── loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <Header
          title="Ijtimoiy tarmoqlarni sozlash"
          subtitle="Maqola sahifasidagi ijtimoiy tarmoq havolalarini boshqaring"
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full" />
        </div>
      </div>
    );
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      <Header
        title="Ijtimoiy tarmoqlarni sozlash"
        subtitle="Maqola sahifasidagi «Biz bilan bo'ling» bo'limini boshqaring"
      />

      <div className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="max-w-2xl space-y-6">

          {/* ── Section title ── */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-violet-50 text-violet-600">
                <Languages size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Bo'lim sarlavhasi</h2>
                <p className="text-xs text-slate-500 mt-0.5">Har til uchun sarlavha kiriting</p>
              </div>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(
                [
                  { key: 'title_uz' as const, lang: "O'zbekcha" },
                  { key: 'title_ru' as const, lang: 'Ruscha' },
                  { key: 'title_en' as const, lang: 'English' },
                ] as const
              ).map(({ key, lang }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    {lang}
                  </label>
                  <input
                    type="text"
                    value={form[key]}
                    onChange={(e) => handleChange(key, e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ── Social network links ── */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50 text-blue-600">
                <Globe size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Ijtimoiy tarmoqlar</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  URL kiriting va ko'rinishini yoqing/o'chiring
                </p>
              </div>
            </div>
            <div className="p-6 space-y-3">
              <UrlField
                icon={<Send size={14} className="text-sky-500" />}
                label="Telegram"
                fieldKey="telegram_url"
                enabledKey="telegram_enabled"
                values={form}
                errors={errors}
                onChange={handleChange}
                placeholder="https://t.me/milliy_tiklanish"
              />
              <UrlField
                icon={<Camera size={14} className="text-pink-500" />}
                label="Instagram"
                fieldKey="instagram_url"
                enabledKey="instagram_enabled"
                values={form}
                errors={errors}
                onChange={handleChange}
                placeholder="https://instagram.com/milliy_tiklanish"
              />
              <UrlField
                icon={<Video size={14} className="text-red-500" />}
                label="YouTube"
                fieldKey="youtube_url"
                enabledKey="youtube_enabled"
                values={form}
                errors={errors}
                onChange={handleChange}
                placeholder="https://youtube.com/@milliy_tiklanish"
              />
              <UrlField
                icon={<ThumbsUp size={14} className="text-blue-600" />}
                label="Facebook"
                fieldKey="facebook_url"
                enabledKey="facebook_enabled"
                values={form}
                errors={errors}
                onChange={handleChange}
                placeholder="https://facebook.com/milliy.tiklanish"
              />
              <UrlField
                icon={<AtSign size={14} className="text-sky-400" />}
                label="Twitter / X"
                fieldKey="twitter_url"
                enabledKey="twitter_enabled"
                values={form}
                errors={errors}
                onChange={handleChange}
                placeholder="https://x.com/milliy_tiklanish"
              />
              <UrlField
                icon={<Music size={14} className="text-slate-900" />}
                label="TikTok"
                fieldKey="tiktok_url"
                enabledKey="tiktok_enabled"
                values={form}
                errors={errors}
                onChange={handleChange}
                placeholder="https://tiktok.com/@milliy_tiklanish"
              />
            </div>
          </div>

          {/* ── Save button ── */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {saving ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>

            {form.updated_at && (
              <p className="text-xs text-slate-400">
                Oxirgi saqlash:{' '}
                {new Date(form.updated_at).toLocaleString('uz-UZ', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Toast notification ── */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-lg text-sm font-medium transition-all animate-in slide-in-from-bottom-4 ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          {toast.message}
        </div>
      )}
    </div>
  );
}
