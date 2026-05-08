'use client';

import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/header';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { EditorialRecommendation, Article, Category } from '@/types';
import {
  Star,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  X,
  Search,
  CheckCircle,
  XCircle,
  ImageOff,
} from 'lucide-react';

// ─── Demo data ────────────────────────────────────────────────────────────────
const DEMO_ARTICLES: Article[] = [
  {
    id: '1', title_uz: "O'zbekiston siyosatidagi yangiliklar", title_uz_cy: 'Ўзбекистон сиёсатидаги янгиликлар',
    title_ru: 'Новости политики Узбекистана', title_en: 'Uzbekistan Politics News',
    summary_uz: '', summary_uz_cy: '', summary_ru: '', summary_en: '',
    content_uz: '', content_uz_cy: '', content_ru: '', content_en: '',
    category_id: 'cat1', is_premium: false, is_published: true,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    view_count: 1240,
    featured_image_url: undefined,
    category: { id: 'cat1', name_uz: 'Siyosat', name_uz_cy: 'Сиёсат', name_ru: 'Политика', name_en: 'Politics', slug: 'siyosat', sort_order: 1, is_active: true, created_at: '' },
  },
  {
    id: '2', title_uz: "Jahon iqtisodiyoti: so'nggi tendensiyalar", title_uz_cy: 'Жаҳон иқтисодиёти: сўнгги тенденсиялар',
    title_ru: 'Мировая экономика: последние тенденции', title_en: 'World Economy: Latest Trends',
    summary_uz: '', summary_uz_cy: '', summary_ru: '', summary_en: '',
    content_uz: '', content_uz_cy: '', content_ru: '', content_en: '',
    category_id: 'cat2', is_premium: true, is_published: true,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    view_count: 890,
    featured_image_url: undefined,
    category: { id: 'cat2', name_uz: 'Iqtisodiyot', name_uz_cy: 'Иқтисодиёт', name_ru: 'Экономика', name_en: 'Economy', slug: 'iqtisodiyot', sort_order: 2, is_active: true, created_at: '' },
  },
  {
    id: '3', title_uz: "Texnologiya dunyosida inqilob", title_uz_cy: 'Технология дунёсида инқилоб',
    title_ru: 'Революция в мире технологий', title_en: 'Revolution in Tech World',
    summary_uz: '', summary_uz_cy: '', summary_ru: '', summary_en: '',
    content_uz: '', content_uz_cy: '', content_ru: '', content_en: '',
    category_id: 'cat3', is_premium: false, is_published: true,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    view_count: 670,
    featured_image_url: undefined,
    category: { id: 'cat3', name_uz: 'Texnologiya', name_uz_cy: 'Технология', name_ru: 'Технология', name_en: 'Technology', slug: 'texnologiya', sort_order: 3, is_active: true, created_at: '' },
  },
];

const DEMO_RECOMMENDATIONS: EditorialRecommendation[] = [
  { id: 'r1', article_id: '1', sort_order: 0, is_active: true, created_at: '', updated_at: '', article: DEMO_ARTICLES[0] },
  { id: 'r2', article_id: '2', sort_order: 1, is_active: true, created_at: '', updated_at: '', article: DEMO_ARTICLES[1] },
];

const MAX_RECOMMENDATIONS = 10;

// ─── Component ────────────────────────────────────────────────────────────────
export default function EditorialRecommendationsPage() {
  const [recommendations, setRecommendations] = useState<EditorialRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerError, setPickerError] = useState<string | null>(null);

  // Article picker modal
  const [pickerOpen, setPickerOpen] = useState(false);
  const [allArticles, setAllArticles] = useState<Article[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [search, setSearch] = useState('');

  // ── Fetch recommendations with joined article data ──
  const fetchRecommendations = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setRecommendations(DEMO_RECOMMENDATIONS);
      setLoading(false);
      return;
    }

    const { data, error: err } = await supabase
      .from('editorial_recommendations')
      .select(`
        id, article_id, sort_order, is_active, created_at, updated_at,
        article:articles(
          id, title_uz, title_uz_cy, title_ru, featured_image_url,
          is_published, is_premium, view_count,
          category:categories(id, name_uz, name_ru)
        )
      `)
      .order('sort_order', { ascending: true });

    if (err) {
      setError(err.message);
      setRecommendations(DEMO_RECOMMENDATIONS);
    } else {
      const normalized = (data ?? []).map((item) => {
        const rawArticle = Array.isArray(item.article) ? item.article[0] ?? null : item.article;
        const article = rawArticle
          ? {
              ...rawArticle,
              category: Array.isArray(rawArticle.category)
                ? rawArticle.category[0] ?? null
                : rawArticle.category,
            }
          : null;
        return { ...item, article };
      });
      setRecommendations(normalized as unknown as EditorialRecommendation[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchRecommendations(); }, [fetchRecommendations]);

  // ── Fetch all articles for picker ──
  const openPicker = async () => {
    setPickerOpen(true);
    setSearch('');
    setPickerError(null);
    if (allArticles.length > 0) return;

    setArticlesLoading(true);
    if (!isSupabaseConfigured()) {
      setAllArticles(DEMO_ARTICLES);
      setArticlesLoading(false);
      return;
    }

    const { data } = await supabase
      .from('articles')
      .select(`
        id, title_uz, title_uz_cy, title_ru, featured_image_url,
        is_published, is_premium, view_count,
        category:categories(id, name_uz, name_ru)
      `)
      .order('created_at', { ascending: false })
      .limit(200);

    const normalizedArticles = (data ?? []).map((a) => ({
      ...a,
      category: Array.isArray(a.category) ? a.category[0] ?? null : a.category,
    }));
    setAllArticles(normalizedArticles as unknown as Article[]);
    setArticlesLoading(false);
  };

  // ── Add recommendation ──
  const addArticle = async (article: Article) => {
    if (recommendations.length >= MAX_RECOMMENDATIONS) return;
    if (recommendations.some((r) => r.article_id === article.id)) {
      setPickerError('Bu maqola allaqachon tavsiya qilingan');
      return;
    }

    const newSortOrder = recommendations.length;
    const tempRec: EditorialRecommendation = {
      id: `temp-${Date.now()}`,
      article_id: article.id,
      sort_order: newSortOrder,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      article,
    };

    if (isSupabaseConfigured()) {
      setSaving(true);

      // Pre-check: ensure no existing recommendation for this article
      const { data: existing } = await supabase
        .from('editorial_recommendations')
        .select('id')
        .eq('article_id', article.id)
        .maybeSingle();

      if (existing) {
        setSaving(false);
        setPickerError('Bu maqola allaqachon tavsiya qilingan');
        return;
      }

      const { data, error: err } = await supabase
        .from('editorial_recommendations')
        .insert([{ article_id: article.id, sort_order: newSortOrder, is_active: true }])
        .select()
        .single();
      setSaving(false);
      if (err) {
        if (err.code === '23505') {
          setPickerError('Bu maqola allaqachon tavsiya qilingan');
        } else {
          setError(err.message);
        }
        return;
      }
      setRecommendations((prev) => [...prev, { ...(data as EditorialRecommendation), article }]);
    } else {
      setRecommendations((prev) => [...prev, tempRec]);
    }

    setPickerOpen(false);
    flashSaved();
  };

  // ── Remove recommendation ──
  const removeRecommendation = async (rec: EditorialRecommendation) => {
    if (isSupabaseConfigured()) {
      setSaving(true);
      await supabase.from('editorial_recommendations').delete().eq('id', rec.id);
      setSaving(false);
    }
    const updated = recommendations
      .filter((r) => r.id !== rec.id)
      .map((r, i) => ({ ...r, sort_order: i }));
    setRecommendations(updated);
    if (isSupabaseConfigured()) await persistOrder(updated);
    flashSaved();
  };

  // ── Toggle active ──
  const toggleActive = async (rec: EditorialRecommendation) => {
    const newValue = !rec.is_active;
    setRecommendations((prev) =>
      prev.map((r) => r.id === rec.id ? { ...r, is_active: newValue } : r)
    );
    if (isSupabaseConfigured()) {
      await supabase
        .from('editorial_recommendations')
        .update({ is_active: newValue, updated_at: new Date().toISOString() })
        .eq('id', rec.id);
    }
    flashSaved();
  };

  // ── Reorder ──
  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= recommendations.length) return;

    const updated = [...recommendations];
    [updated[index], updated[target]] = [updated[target], updated[index]];
    const reordered = updated.map((r, i) => ({ ...r, sort_order: i }));
    setRecommendations(reordered);
    if (isSupabaseConfigured()) await persistOrder(reordered);
    flashSaved();
  };

  // ── Persist sort order batch ──
  const persistOrder = async (list: EditorialRecommendation[]) => {
    const updates = list.map((r) =>
      supabase
        .from('editorial_recommendations')
        .update({ sort_order: r.sort_order, updated_at: new Date().toISOString() })
        .eq('id', r.id)
    );
    await Promise.all(updates);
  };

  const flashSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  // ── Filtered articles (exclude already selected) ──
  const selectedIds = new Set(recommendations.map((r) => r.article_id));
  const filteredArticles = allArticles.filter((a) => {
    if (selectedIds.has(a.id)) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      a.title_uz.toLowerCase().includes(q) ||
      a.title_ru.toLowerCase().includes(q) ||
      (a.category as Category | undefined)?.name_uz?.toLowerCase().includes(q)
    );
  });

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Tahririyat tavsiyalari" />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full" />
        </div>
      </div>
    );
  }

  // ─── Main UI ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      <Header
        title="Tahririyat tavsiyalari"
        subtitle="Tahririyat tavsiya qiladi — o'qish sahifasidagi yon panel"
      />

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-3xl space-y-6">

          {/* Status bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                recommendations.length >= MAX_RECOMMENDATIONS
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {recommendations.length} / {MAX_RECOMMENDATIONS} maqola
              </span>
              {saved && (
                <span className="text-sm text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle size={14} /> Saqlandi
                </span>
              )}
              {saving && (
                <span className="text-sm text-slate-400 flex items-center gap-1">
                  <div className="animate-spin w-3 h-3 border-2 border-blue-200 border-t-blue-500 rounded-full" />
                  Saqlanmoqda...
                </span>
              )}
              {error && (
                <span className="text-sm text-red-500">{error}</span>
              )}
            </div>

            <button
              onClick={openPicker}
              disabled={recommendations.length >= MAX_RECOMMENDATIONS || saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus size={16} />
              Maqola qo'shish
            </button>
          </div>

          {/* Hint */}
          <p className="text-sm text-slate-500">
            Saralash tartibini o'zgartirish uchun yuqori/quyi tugmalardan foydalaning. Faqat <strong>faol</strong> tavsiyalar veb-saytda ko'rsatiladi.
          </p>

          {/* Empty state */}
          {recommendations.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
              <Star size={40} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Hali tavsiyalar qo'shilmagan</p>
              <p className="text-sm text-slate-400 mt-1">
                "Maqola qo'shish" tugmasini bosib boshlang
              </p>
            </div>
          )}

          {/* Recommendations list */}
          {recommendations.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <ul className="divide-y divide-slate-100">
                {recommendations.map((rec, index) => {
                  const article = rec.article;
                  const category = article?.category as Category | undefined;
                  return (
                    <li key={rec.id} className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors">

                      {/* Sort order badge */}
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center">
                        {index + 1}
                      </span>

                      {/* Thumbnail */}
                      <div className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                        {article?.featured_image_url ? (
                          <img
                            src={article.featured_image_url}
                            alt={article.title_uz}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <ImageOff size={20} />
                          </div>
                        )}
                      </div>

                      {/* Article info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate leading-snug">
                          {article?.title_uz ?? '—'}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {category && (
                            <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium">
                              {category.name_uz}
                            </span>
                          )}
                          {article?.is_premium && (
                            <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full font-medium">
                              Premium
                            </span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            article?.is_published
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            {article?.is_published ? 'Chop etilgan' : 'Qoralama'}
                          </span>
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-1 flex-shrink-0">

                        {/* Move up/down */}
                        <button
                          onClick={() => move(index, -1)}
                          disabled={index === 0 || saving}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Yuqoriga"
                        >
                          <ChevronUp size={16} />
                        </button>
                        <button
                          onClick={() => move(index, 1)}
                          disabled={index === recommendations.length - 1 || saving}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Pastga"
                        >
                          <ChevronDown size={16} />
                        </button>

                        {/* Toggle active */}
                        <button
                          onClick={() => toggleActive(rec)}
                          disabled={saving}
                          className={`p-1.5 rounded-lg transition-colors ${
                            rec.is_active
                              ? 'text-emerald-600 hover:bg-emerald-50'
                              : 'text-slate-400 hover:bg-slate-100'
                          }`}
                          title={rec.is_active ? 'Faol — o\'chirish' : 'Nofaol — yoqish'}
                        >
                          {rec.is_active ? <CheckCircle size={18} /> : <XCircle size={18} />}
                        </button>

                        {/* Remove */}
                        <button
                          onClick={() => removeRecommendation(rec)}
                          disabled={saving}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30"
                          title="O'chirish"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Info card */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
            <strong>Eslatma:</strong> Bu tavsiyalar veb-saytdagi maqola o'qish sahifasining o'ng tomonida "Tahririyat tavsiya qiladi" deb ko'rsatiladi. Faqat faol tavsiyalar ko'rinadi.
          </div>
        </div>
      </div>

      {/* ── Article Picker Modal ─────────────────────────────────────────── */}
      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">

            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Maqola tanlash</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Allaqachon tanlangan maqolalar ro'yxatda ko'rsatilmaydi
                </p>
              </div>
              <button
                onClick={() => setPickerOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Picker error */}
            {pickerError && (
              <div className="mx-6 mt-4 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between gap-3">
                <span className="text-sm text-amber-700 font-medium">{pickerError}</span>
                <button
                  onClick={() => setPickerError(null)}
                  className="text-amber-500 hover:text-amber-700 flex-shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Search */}
            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Maqola nomini qidiring..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
            </div>

            {/* Article list */}
            <div className="flex-1 overflow-y-auto">
              {articlesLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin w-6 h-6 border-4 border-blue-200 border-t-blue-600 rounded-full" />
                </div>
              ) : filteredArticles.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <Search size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Maqola topilmadi</p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {filteredArticles.map((article) => {
                    const cat = article.category as Category | undefined;
                    return (
                      <li key={article.id}>
                        <button
                          onClick={() => addArticle(article)}
                          className="w-full flex items-center gap-4 px-6 py-4 hover:bg-blue-50 transition-colors text-left"
                        >
                          {/* Thumbnail */}
                          <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                            {article.featured_image_url ? (
                              <img
                                src={article.featured_image_url}
                                alt={article.title_uz}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <ImageOff size={16} />
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">
                              {article.title_uz}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {cat && (
                                <span className="text-xs text-blue-600 font-medium">{cat.name_uz}</span>
                              )}
                              <span className={`text-xs ${article.is_published ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {article.is_published ? 'Chop etilgan' : 'Qoralama'}
                              </span>
                              {article.is_premium && (
                                <span className="text-xs text-amber-600 font-medium">Premium</span>
                              )}
                            </div>
                          </div>

                          {/* Add indicator */}
                          <Plus size={16} className="flex-shrink-0 text-blue-500" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Modal footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
              <p className="text-xs text-slate-400 text-center">
                {filteredArticles.length} ta maqola mavjud • Maksimum {MAX_RECOMMENDATIONS} ta tavsiya qo'shish mumkin
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
