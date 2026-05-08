'use client';

import { Header } from '@/components/header';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Article } from '@/types';
import { Plus, Edit2, Trash2, Eye, EyeOff, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!isSupabaseConfigured()) {
        setArticles([
          {
            id: '1',
            title_uz: "O'zbekiston yangiliklari",
            title_uz_cy: 'Ўзбекистон янгиликлари',
            title_ru: 'Новости Узбекистана',
            title_en: 'Uzbekistan News',
            summary_uz: 'Bugungi yangiliklari...',
            summary_uz_cy: 'Бугунги янгиликлари...',
            summary_ru: 'Сегодняшние новости...',
            summary_en: "Today's news...",
            content_uz: '',
            content_uz_cy: '',
            content_ru: '',
            content_en: '',
            category_id: '1',
            is_premium: false,
            is_published: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            view_count: 234,
          },
          {
            id: '2',
            title_uz: 'Jahon iqtisodiyoti',
            title_uz_cy: 'Жаҳон иқтисодиёти',
            title_ru: 'Мировая экономика',
            title_en: 'World Economy',
            summary_uz: 'Iqtisodiy yangiliklari...',
            summary_uz_cy: 'Иқтисодий янгиликлари...',
            summary_ru: 'Экономические новости...',
            summary_en: 'Economic news...',
            content_uz: '',
            content_uz_cy: '',
            content_ru: '',
            content_en: '',
            category_id: '2',
            is_premium: true,
            is_published: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            view_count: 567,
          },
        ]);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('articles')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
        setArticles([]);
      } else {
        setArticles(data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchArticles(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      if (isSupabaseConfigured()) {
        const { error: delError } = await supabase.from('articles').delete().eq('id', id);
        if (delError) throw new Error(delError.message);
      }
      setArticles((prev) => prev.filter((a) => a.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "O'chirishda xatolik");
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('uz-UZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Maqolalar"
        subtitle="Barcha maqolalarni boshqaring va tahrir qiling"
      />

      <div className="flex-1 p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-900">
            Maqolalar ro&apos;yxati
            {articles.length > 0 && (
              <span className="ml-2 text-sm font-normal text-slate-500">({articles.length} ta)</span>
            )}
          </h2>
          <Link
            href="/articles/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus size={20} />
            Yangi maqola
          </Link>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start justify-between gap-3">
            <p className="text-sm text-red-800">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 flex-shrink-0">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Demo notice */}
        {!isSupabaseConfigured() && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Demo rejim:</strong> Supabase sozlanmagan. Haqiqiy ma&apos;lumotlar uchun{' '}
              <code className="bg-yellow-100 px-1 rounded">.env.local</code> faylini{' '}
              <code className="bg-yellow-100 px-1 rounded">.env.local.example</code> asosida yarating.
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-4" />
              <p className="text-slate-600">Yuklanmoqda...</p>
            </div>
          </div>
        ) : articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 bg-white rounded-lg border border-slate-200 gap-3">
            <p className="text-slate-600">Hozircha maqola yo&apos;q</p>
            <Link
              href="/articles/new"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Birinchi maqolani qo&apos;shing
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Sarlavha</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Yaratilgan</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Ko&apos;rishlar</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-slate-900">Harakatlari</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {articles.map((article) => (
                  <tr key={article.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-slate-900">{article.title_uz}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {article.is_premium && (
                            <span className="inline-block px-2 py-0.5 text-xs rounded bg-yellow-100 text-yellow-700 font-medium">
                              Premium
                            </span>
                          )}
                          {article.source === 'reader_submission' && (
                            <span className="inline-block px-2 py-0.5 text-xs rounded bg-purple-100 text-purple-700 font-medium">
                              O&apos;quvchi maqolasi
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                          article.is_published
                            ? 'bg-green-100 text-green-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {article.is_published ? (
                          <><Eye size={12} /> Chiqarilgan</>
                        ) : (
                          <><EyeOff size={12} /> Qoralama</>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{formatDate(article.created_at)}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{article.view_count ?? 0}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          href={`/articles/${article.id}/edit`}
                          title="Tahrirlash"
                          className="p-2 rounded hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition-colors"
                        >
                          <Edit2 size={16} />
                        </Link>
                        <button
                          onClick={() => setDeleteConfirm(article.id)}
                          title="O'chirish"
                          className="p-2 rounded hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setDeleteConfirm(null)}
          />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-base font-semibold text-slate-900">Maqolani o&apos;chirish</h3>
            <p className="text-sm text-slate-600 mt-2">
              Bu maqola bazadan butunlay o&apos;chiriladi. Bu amalni bekor qilib bo&apos;lmaydi.
              Davom etasizmi?
            </p>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium transition-colors disabled:opacity-50"
              >
                Bekor qilish
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {deleting ? "O'chirilmoqda..." : "O'chirish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

