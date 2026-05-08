'use client';

import { Header } from '@/components/header';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Author } from '@/types';
import { Plus, Edit2, Trash2, Star, TrendingUp, X, Save, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { uploadToStorage } from '@/lib/storage';

const EMPTY_AUTHOR: Omit<Author, 'id' | 'created_at' | 'updated_at'> = {
  name: '',
  image_url: undefined,
  bio_uz: '',
  bio_uz_cy: '',
  bio_ru: '',
  bio_en: '',
  rating: 0,
  popularity: 0,
};

export default function AuthorsPage() {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Author> | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchAuthors = async () => {
    setLoading(true);
    if (!isSupabaseConfigured()) {
      setAuthors([
        {
          id: '1', name: 'Alisher Navoiy', rating: 4.9, popularity: 9820,
          bio_uz: 'Taniqli muallif', bio_uz_cy: '', bio_ru: '', bio_en: '',
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        },
      ]);
      setLoading(false);
      return;
    }
    const { data } = await supabase.from('authors').select('*').order('popularity', { ascending: false });
    setAuthors(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAuthors(); }, []);

  const handleSave = async () => {
    if (!editing?.name?.trim()) return;
    setSaving(true);
    const payload = {
      name: editing.name,
      image_url: editing.image_url ?? null,
      bio_uz: editing.bio_uz ?? '',
      bio_uz_cy: editing.bio_uz_cy ?? '',
      bio_ru: editing.bio_ru ?? '',
      bio_en: editing.bio_en ?? '',
      rating: editing.rating ?? 0,
      popularity: editing.popularity ?? 0,
      updated_at: new Date().toISOString(),
    };
    if (isSupabaseConfigured()) {
      if (editing.id) {
        await supabase.from('authors').update(payload).eq('id', editing.id);
      } else {
        await supabase.from('authors').insert([payload]);
      }
    }
    setEditing(null);
    setSaving(false);
    fetchAuthors();
  };

  const handleDelete = async (id: string) => {
    if (isSupabaseConfigured()) await supabase.from('authors').delete().eq('id', id);
    setAuthors((prev) => prev.filter((a) => a.id !== id));
    setDeleteConfirm(null);
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadToStorage('article-images', file, 'authors');
      setEditing((prev) => prev ? { ...prev, image_url: url } : prev);
    } catch {
      setEditing((prev) => prev ? { ...prev, image_url: URL.createObjectURL(file) } : prev);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Mualliflar" subtitle="Mualliflarni boshqaring va reyting belgilang" />

      <div className="flex-1 p-8">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-slate-500">{authors.length} ta muallif</p>
          <button
            onClick={() => setEditing({ ...EMPTY_AUTHOR })}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
          >
            <Plus size={16} />
            Yangi muallif
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {authors.map((author) => (
              <div key={author.id} className="bg-white border border-slate-200 rounded-xl p-5 flex items-start gap-4">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 flex-shrink-0">
                  {author.image_url ? (
                    <img src={author.image_url} alt={author.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-lg font-bold">
                      {author.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{author.name}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="flex items-center gap-1 text-xs text-amber-600">
                      <Star size={11} fill="currentColor" />
                      {author.rating?.toFixed(1) ?? '0.0'}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-blue-600">
                      <TrendingUp size={11} />
                      {author.popularity?.toLocaleString() ?? 0}
                    </span>
                  </div>
                  {author.bio_uz && (
                    <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{author.bio_uz}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <button
                    onClick={() => setEditing(author)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 border border-slate-200 rounded-lg transition-colors"
                  >
                    <Edit2 size={13} />
                  </button>
                  {deleteConfirm === author.id ? (
                    <div className="flex gap-1">
                      <button onClick={() => handleDelete(author.id)} className="px-1.5 py-1 text-xs bg-red-600 text-white rounded">Ha</button>
                      <button onClick={() => setDeleteConfirm(null)} className="px-1.5 py-1 text-xs bg-slate-100 text-slate-600 rounded">Yo&apos;q</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(author.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 border border-slate-200 rounded-lg transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editing !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">
                {editing.id ? 'Muallif tahrirlash' : 'Yangi muallif'}
              </h2>
              <button onClick={() => setEditing(null)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Image */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-100 flex-shrink-0 flex items-center justify-center">
                  {editing.image_url ? (
                    <img src={editing.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-slate-400 text-xl font-bold">{editing.name?.charAt(0) ?? '?'}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <Upload size={14} />
                  {uploading ? 'Yuklanmoqda...' : 'Rasm yuklash'}
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ism <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={editing.name ?? ''}
                  onChange={(e) => setEditing((p) => p ? { ...p, name: e.target.value } : p)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="To'liq ism"
                />
              </div>

              {/* Rating + Popularity */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                    <Star size={12} className="text-amber-500" /> Reyting (0–5)
                  </label>
                  <input
                    type="number" min={0} max={5} step={0.1}
                    value={editing.rating ?? 0}
                    onChange={(e) => setEditing((p) => p ? { ...p, rating: parseFloat(e.target.value) || 0 } : p)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                    <TrendingUp size={12} className="text-blue-500" /> Omillik
                  </label>
                  <input
                    type="number" min={0}
                    value={editing.popularity ?? 0}
                    onChange={(e) => setEditing((p) => p ? { ...p, popularity: parseInt(e.target.value) || 0 } : p)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Bio */}
              {(['uz', 'uz_cy', 'ru', 'en'] as const).map((lang) => (
                <div key={lang}>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Bio ({lang === 'uz' ? "O'zbekcha" : lang === 'uz_cy' ? 'Ўзбекча' : lang === 'ru' ? 'Русский' : 'English'})
                  </label>
                  <textarea
                    rows={2}
                    value={(editing[`bio_${lang}` as keyof typeof editing] as string) ?? ''}
                    onChange={(e) => setEditing((p) => p ? { ...p, [`bio_${lang}`]: e.target.value } : p)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 px-6 pb-6">
              <button onClick={() => setEditing(null)} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 text-sm font-medium">
                Bekor qilish
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editing.name?.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
              >
                <Save size={14} />
                {saving ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
