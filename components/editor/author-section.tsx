'use client';

import { useRef, useState } from 'react';
import { Upload, X, User } from 'lucide-react';
import { uploadToStorage } from '@/lib/storage';
import { ArticleFormData, LangKey, LANG_TABS } from '@/types/blocks';

interface AuthorSectionProps {
  form: ArticleFormData;
  onChange: <K extends keyof ArticleFormData>(key: K, value: ArticleFormData[K]) => void;
}

export function AuthorSection({ form, onChange }: AuthorSectionProps) {
  const [activeBioLang, setActiveBioLang] = useState<LangKey>('uz');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const bioKey = `author_bio_${activeBioLang}` as keyof ArticleFormData;
  const bioValue = (form[bioKey] as string) ?? '';

  const handleImageFile = async (file: File) => {
    setUploadError(null);
    const localUrl = URL.createObjectURL(file);
    onChange('author_image_url', localUrl);
    setUploading(true);

    try {
      const uploaded = await uploadToStorage('article-images', file, 'authors');
      onChange('author_image_url', uploaded);
    } catch (err) {
      // Keep local preview if upload fails
      if (err instanceof Error && !err.message.includes('placeholder')) {
        setUploadError(err.message);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    onChange('author_image_url', undefined);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-5">
      <h3 className="text-sm font-semibold text-slate-900">Muallif ma&apos;lumotlari</h3>

      {/* Author name + image row */}
      <div className="flex gap-4 items-start">
        {/* Avatar upload */}
        <div className="flex-shrink-0">
          {form.author_image_url ? (
            <div className="relative w-16 h-16 group">
              <img
                src={form.author_image_url}
                alt="Muallif rasmi"
                className="w-16 h-16 rounded-full object-cover border border-slate-200"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute -top-1 -right-1 p-1 bg-white rounded-full shadow border border-slate-200 text-slate-500 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} />
              </button>
              {uploading && (
                <div className="absolute inset-0 bg-white/70 rounded-full flex items-center justify-center">
                  <div className="animate-spin w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full" />
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-16 h-16 rounded-full border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/30 transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <div className="animate-spin w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full" />
              ) : (
                <>
                  <User size={18} />
                  <span className="text-[9px] mt-0.5 font-medium">Rasm</span>
                </>
              )}
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageFile(file);
            }}
          />
          {uploadError && <p className="mt-1 text-xs text-red-600 w-16 break-words">{uploadError}</p>}
        </div>

        {/* Author name */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 mb-1">Muallif ismi</label>
          <input
            type="text"
            value={form.author_name ?? ''}
            onChange={(e) => onChange('author_name', e.target.value)}
            placeholder="To'liq ism..."
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
      </div>

      {/* Bio with language tabs */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Muallif haqida (Bio)</label>

        {/* Mini lang tabs */}
        <div className="flex border-b border-slate-200 mb-3 gap-0.5">
          {LANG_TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveBioLang(key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-t-md border transition-colors ${
                activeBioLang === key
                  ? 'border-blue-500 border-b-white bg-white text-blue-600 -mb-px'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <textarea
          rows={3}
          value={bioValue}
          onChange={(e) => onChange(bioKey, e.target.value)}
          placeholder="Muallif haqida qisqacha ma'lumot..."
          className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
        />

        {/* Fill indicator */}
        <div className="flex gap-2 mt-1.5 flex-wrap">
          {LANG_TABS.map(({ key, label }) => {
            const val = (form[`author_bio_${key}` as keyof ArticleFormData] as string) ?? '';
            return (
              <span
                key={key}
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  val.trim()
                    ? 'bg-green-100 text-green-700'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {label}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
