'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/header';
import { Plus, Edit2, Trash2, X, GripVertical, CheckCircle, XCircle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Category } from '@/types/index';

interface CategoryForm {
  name_uz: string;
  name_uz_cy: string;
  name_ru: string;
  name_en: string;
  slug: string;
  description_uz: string;
  description_uz_cy: string;
  description_ru: string;
  description_en: string;
  sort_order: number;
  is_active: boolean;
}

const EMPTY_FORM: CategoryForm = {
  name_uz: '',
  name_uz_cy: '',
  name_ru: '',
  name_en: '',
  slug: '',
  description_uz: '',
  description_uz_cy: '',
  description_ru: '',
  description_en: '',
  sort_order: 0,
  is_active: true,
};

const DEMO_CATEGORIES: Category[] = [
  { id: '1', name_uz: 'Siyosat',     name_uz_cy: 'Сиёсат',     name_ru: 'Политика',   name_en: 'Politics',   slug: 'siyosat',     sort_order: 1, is_active: true,  created_at: '' },
  { id: '2', name_uz: 'Iqtisodiyot', name_uz_cy: 'Иқтисодият', name_ru: 'Экономика',  name_en: 'Economy',    slug: 'iqtisodiyot', sort_order: 2, is_active: true,  created_at: '' },
  { id: '3', name_uz: 'Sport',        name_uz_cy: 'Спорт',       name_ru: 'Спорт',      name_en: 'Sports',     slug: 'sport',       sort_order: 3, is_active: true,  created_at: '' },
  { id: '4', name_uz: 'Texnologiya',  name_uz_cy: 'Технология',  name_ru: 'Технология', name_en: 'Technology', slug: 'texnologiya', sort_order: 4, is_active: false, created_at: '' },
];

function toSlug(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCategories = async () => {
    if (!isSupabaseConfigured()) {
      setCategories(DEMO_CATEGORIES);
      setLoading(false);
      return;
    }
    const { data, error: err } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name_uz', { ascending: true });
    if (err) {
      setError(err.message);
      setCategories(DEMO_CATEGORIES);
    } else {
      setCategories(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchCategories(); }, []);

  const openCreate = () => {
    setEditing(null);
    const nextOrder = categories.length > 0 ? Math.max(...categories.map((c) => c.sort_order ?? 0)) + 1 : 1;
    setForm({ ...EMPTY_FORM, sort_order: nextOrder });
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setForm({
      name_uz: cat.name_uz,
      name_uz_cy: cat.name_uz_cy,
      name_ru: cat.name_ru,
      name_en: cat.name_en,
      slug: cat.slug,
      description_uz: cat.description_uz ?? '',
      description_uz_cy: cat.description_uz_cy ?? '',
      description_ru: cat.description_ru ?? '',
      description_en: cat.description_en ?? '',
      sort_order: cat.sort_order ?? 0,
      is_active: cat.is_active ?? true,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleFormChange = <K extends keyof CategoryForm>(key: K, value: CategoryForm[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'name_uz' && !editing) {
        (next as CategoryForm).slug = toSlug(value as string);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!form.name_uz.trim()) { setFormError("O'zbek tilidagi nom majburiy"); return; }
    if (!form.slug.trim())    { setFormError('Slug majburiy'); return; }

    setSaving(true);
    setFormError(null);

    const payload = {
      name_uz:    form.name_uz.trim(),
      name_uz_cy: form.name_uz_cy.trim(),
      name_ru:    form.name_ru.trim(),
      name_en:    form.name_en.trim(),
      slug:       form.slug.trim(),
      description_uz:    form.description_uz.trim(),
      description_uz_cy: form.description_uz_cy.trim(),
      description_ru:    form.description_ru.trim(),
      description_en:    form.description_en.trim(),
      sort_order: form.sort_order,
      is_active:  form.is_active,
    };

    if (!isSupabaseConfigured()) { setModalOpen(false); setSaving(false); return; }

    if (editing) {
      const { error: err } = await supabase
        .from('categories')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', editing.id);
      if (err) { setFormError(err.message); setSaving(false); return; }
    } else {
      const { error: err } = await supabase.from('categories').insert([payload]);
      if (err) { setFormError(err.message); setSaving(false); return; }
    }

    setModalOpen(false);
    setSaving(false);
    await fetchCategories();
  };

  const handleDelete = async () => {
    if (!deleteTarget || !isSupabaseConfigured()) { setDeleteTarget(null); return; }
    setDeleting(true);
    const { error: err } = await supabase.from('categories').delete().eq('id', deleteTarget.id);
    if (err) setError(err.message);
    setDeleting(false);
    setDeleteTarget(null);
    await fetchCategories();
  };

  const handleToggleActive = async (cat: Category) => {
    if (!isSupabaseConfigured()) return;
    await supabase
      .from('categories')
      .update({ is_active: !cat.is_active, updated_at: new Date().toISOString() })
      .eq('id', cat.id);
    await fetchCategories();
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Kategoriyalar" subtitle="Maqola kategoriyalarini boshqaring" />

      <div className="flex-1 p-8 overflow-auto">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-slate-500">
            {loading ? 'Yuklanmoqda...' : `${categories.length} ta kategoriya`}
          </p>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
          >
            <Plus size={18} />
            Yangi kategoriya
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center justify-between text-sm">
            <span>{error}</span>
            <button onClick={() => setError(null)}><X size={16} /></button>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-8 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="py-20 text-center text-slate-400">
              <p className="text-sm">Hozircha kategoriyalar mavjud emas.</p>
              <button
                onClick={openCreate}
                className="mt-3 text-blue-600 hover:underline text-sm font-medium"
              >
                Birinchi kategoriyani qo&apos;shing
              </button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="w-8 px-4 py-3"></th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Nomi</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Slug</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell w-24">Tartib</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Holat</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide w-24">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-4 py-3 text-slate-300 group-hover:text-slate-400">
                      <GripVertical size={16} />
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="font-semibold text-slate-900">{cat.name_uz}</span>
                        {cat.name_ru && (
                          <span className="ml-2 text-xs text-slate-400">{cat.name_ru}</span>
                        )}
                      </div>
                      {cat.name_uz_cy && (
                        <div className="text-xs text-slate-400 mt-0.5">{cat.name_uz_cy}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <code className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">{cat.slug}</code>
                    </td>
                    <td className="px-4 py-3 text-center hidden lg:table-cell">
                      <span className="text-slate-500 text-xs font-medium">{cat.sort_order}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleActive(cat)}
                        title={cat.is_active ? 'Nofaol qilish' : 'Faol qilish'}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
                        style={cat.is_active ? { background: '#dcfce7', color: '#15803d' } : { background: '#f1f5f9', color: '#94a3b8' }}
                      >
                        {cat.is_active
                          ? <><CheckCircle size={12} /> Faol</>
                          : <><XCircle size={12} /> Nofaol</>
                        }
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(cat)}
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition-colors"
                          title="Tahrirlash"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(cat)}
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-red-600 transition-colors"
                          title="O'chirish"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Create / Edit Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editing ? 'Kategoriyani tahrirlash' : 'Yangi kategoriya'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {editing ? `ID: ${editing.id}` : 'Barcha tillarda nom kiriting'}
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{formError}</div>
              )}

              {/* Names */}
              <section>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Kategoriya nomi</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">O&apos;zbek (lotin) <span className="text-red-500">*</span></label>
                    <input type="text" value={form.name_uz} onChange={(e) => handleFormChange('name_uz', e.target.value)} placeholder="masalan: Siyosat" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">O&apos;zbek (kirill)</label>
                    <input type="text" value={form.name_uz_cy} onChange={(e) => handleFormChange('name_uz_cy', e.target.value)} placeholder="масалан: Сиёсат" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Ruscha</label>
                    <input type="text" value={form.name_ru} onChange={(e) => handleFormChange('name_ru', e.target.value)} placeholder="например: Политика" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Ingilizcha</label>
                    <input type="text" value={form.name_en} onChange={(e) => handleFormChange('name_en', e.target.value)} placeholder="e.g. Politics" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              </section>

              {/* Slug & Sort */}
              <section>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">URL va tartib</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Slug <span className="text-red-500">*</span></label>
                    <input type="text" value={form.slug} onChange={(e) => handleFormChange('slug', e.target.value)} placeholder="masalan: siyosat" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm" />
                    <p className="mt-1 text-xs text-slate-400">URL da ishlatiladi. Faqat kichik harf, raqam va chiziqcha.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tartib raqami</label>
                    <input type="number" value={form.sort_order} onChange={(e) => handleFormChange('sort_order', Number(e.target.value))} min={0} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              </section>

              {/* Descriptions */}
              <section>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Tavsif (ixtiyoriy)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">O&apos;zbek (lotin)</label>
                    <textarea rows={2} value={form.description_uz} onChange={(e) => handleFormChange('description_uz', e.target.value)} placeholder="Kategoriya haqida qisqa ma'lumot..." className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">O&apos;zbek (kirill)</label>
                    <textarea rows={2} value={form.description_uz_cy} onChange={(e) => handleFormChange('description_uz_cy', e.target.value)} placeholder="Категория ҳақида..." className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Ruscha</label>
                    <textarea rows={2} value={form.description_ru} onChange={(e) => handleFormChange('description_ru', e.target.value)} placeholder="Описание категории..." className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Ingilizcha</label>
                    <textarea rows={2} value={form.description_en} onChange={(e) => handleFormChange('description_en', e.target.value)} placeholder="Category description..." className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm" />
                  </div>
                </div>
              </section>

              {/* Active toggle */}
              <section>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Holat</h3>
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative">
                    <input type="checkbox" checked={form.is_active} onChange={(e) => handleFormChange('is_active', e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">{form.is_active ? 'Faol' : 'Nofaol'}</p>
                    <p className="text-xs text-slate-400">
                      {form.is_active
                        ? "Kategoriya saytda ko'rinadi va maqolalarda tanlanishi mumkin"
                        : 'Kategoriya saytda yashirilgan'}
                    </p>
                  </div>
                </label>
              </section>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-white transition-colors text-sm font-medium">
                Bekor qilish
              </button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors font-medium text-sm">
                {saving ? 'Saqlanmoqda...' : editing ? 'Saqlash' : "Qo'shish"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-start gap-4 mb-5">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 size={20} className="text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Kategoriyani o&apos;chirish</h2>
                <p className="text-sm text-slate-500 mt-1">
                  <strong className="text-slate-800">{deleteTarget.name_uz}</strong> kategoriyasini o&apos;chirmoqchimisiz? Bu amalni qaytarib bo&apos;lmaydi.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors text-sm font-medium">
                Bekor qilish
              </button>
              <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-2 px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60 transition-colors font-medium text-sm">
                <Trash2 size={15} />
                {deleting ? "O'chirilmoqda..." : "O'chirish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
