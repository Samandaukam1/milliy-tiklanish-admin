'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Edit2, Trash2, Play, Pause, ExternalLink, Mic } from 'lucide-react';
import { Header } from '@/components/header';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface AudioArticle {
  id: string;
  title_uz: string;
  audio_url: string;
  is_published: boolean;
  is_premium: boolean;
  created_at: string;
  category?: string;
  view_count?: number;
}

// ─── Demo data ─────────────────────────────────────────────────────────────────

const DEMO_ARTICLES: AudioArticle[] = [
  {
    id: '1',
    title_uz: "O'zbekiston iqtisodiy islohotlari: batafsil tahlil",
    audio_url: 'https://example.com/audio/article-1.mp3',
    is_published: true,
    is_premium: false,
    created_at: '2025-04-15',
    category: 'Iqtisodiyot',
    view_count: 1240,
  },
  {
    id: '2',
    title_uz: 'Milliy tiklanish: madaniy meros va zamonaviylik',
    audio_url: 'https://example.com/audio/article-2.mp3',
    is_published: true,
    is_premium: true,
    created_at: '2025-04-14',
    category: 'Madaniyat',
    view_count: 856,
  },
  {
    id: '3',
    title_uz: "Siyosiy islohotlar va fuqarolik jamiyati",
    audio_url: 'https://example.com/audio/article-3.mp3',
    is_published: false,
    is_premium: false,
    created_at: '2025-04-13',
    category: 'Siyosat',
    view_count: 0,
  },
  {
    id: '4',
    title_uz: "Yoshlar siyosati: imkoniyatlar va muammolar",
    audio_url: 'https://example.com/audio/article-4.mp3',
    is_published: true,
    is_premium: false,
    created_at: '2025-04-12',
    category: 'Jamiyat',
    view_count: 432,
  },
];

// ─── Audio Player Cell ─────────────────────────────────────────────────────────

function AudioPlayerCell({ url }: { url: string }) {
  const [playing, setPlaying] = useState(false);
  const [audio] = useState(() => {
    if (typeof window === 'undefined') return null;
    const a = new Audio(url);
    a.onended = () => setPlaying(false);
    return a;
  });

  const toggle = () => {
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      // Pause all other audios by creating a custom event
      window.dispatchEvent(new CustomEvent('pauseAllAudio'));
      audio.play().catch(() => setPlaying(false));
      setPlaying(true);
    }
  };

  useEffect(() => {
    const handler = () => {
      if (playing) {
        audio?.pause();
        setPlaying(false);
      }
    };
    window.addEventListener('pauseAllAudio', handler);
    return () => {
      window.removeEventListener('pauseAllAudio', handler);
      audio?.pause();
    };
  }, [audio, playing]);

  return (
    <button
      onClick={toggle}
      title={playing ? "To'xtatish" : "Tinglash"}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
        playing
          ? 'bg-orange-600 text-white hover:bg-orange-700'
          : 'bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100'
      }`}
    >
      {playing ? <Pause size={13} /> : <Play size={13} />}
      {playing ? "To'xtatish" : 'Tinglash'}
    </button>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function AudioPage() {
  const [articles, setArticles] = useState<AudioArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);

    if (!isSupabaseConfigured()) {
      setArticles(DEMO_ARTICLES);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('articles')
      .select('id, title_uz, audio_url, is_published, is_premium, created_at, view_count')
      .not('audio_url', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      // Fallback to demo on error so the page never shows blank
      setArticles(DEMO_ARTICLES);
    } else if (data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setArticles(data.map((row: any) => ({
        id: row.id,
        title_uz: row.title_uz,
        audio_url: row.audio_url,
        is_published: row.is_published,
        is_premium: row.is_premium,
        created_at: row.created_at?.slice(0, 10) ?? '',
        view_count: row.view_count,
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id: string) => {
    if (isSupabaseConfigured()) {
      // Clear audio_url on the article rather than deleting the article
      await supabase.from('articles').update({ audio_url: null }).eq('id', id);
    }
    setArticles((prev) => prev.filter((a) => a.id !== id));
    setDeleteConfirm(null);
  };

  const published = articles.filter((a) => a.is_published).length;
  const premium = articles.filter((a) => a.is_premium).length;

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Audio" subtitle="Tahririyat radiosi — maqolalar audio versiyalari" />

      <div className="flex-1 p-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Jami audio', value: articles.length, color: 'text-slate-900' },
            { label: 'Nashr etilgan', value: published, color: 'text-green-700' },
            { label: 'Premium', value: premium, color: 'text-yellow-700' },
            { label: 'Qoralama', value: articles.length - published, color: 'text-slate-500' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-lg border border-slate-200 p-4">
              <p className="text-xs text-slate-500 font-medium">{label}</p>
              <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Notice */}
        {!isSupabaseConfigured() && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Demo rejim:</strong> Supabase sozlanmagan. Namuna ma&apos;lumotlar ko&apos;rsatilmoqda.
              Audio manzillardan faqat fayl mavjud bo&apos;lganda tinglash ishlaydi.
            </p>
          </div>
        )}

        {/* Explanation banner */}
        <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <Mic size={16} className="text-orange-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-orange-900">Tahririyat radiosi</p>
            <p className="text-xs text-orange-700 mt-0.5 leading-relaxed">
              Bu sahifa audio versiyasi mavjud bo&apos;lgan barcha maqolalarni ko&apos;rsatadi.
              Audio versiyasini qo&apos;shish yoki o&apos;zgartirish uchun maqolani tahrirlang.
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">
              Audio Maqolalar
              <span className="ml-2 text-xs font-normal text-slate-500">
                ({articles.length} ta)
              </span>
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full" />
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-16">
              <Mic size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-500">Hali audio maqola yo&apos;q</p>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                Maqola tahrirlash sahifasida audio versiya yuklab qo&apos;shing
              </p>
              <Link
                href="/articles"
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors"
              >
                Maqolalarga o&apos;tish
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Maqola</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Kategoriya</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Holat</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Audio</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Sana</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {articles.map((article) => (
                    <tr key={article.id} className="hover:bg-slate-50/60 transition-colors group">
                      {/* Title */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Mic size={14} className="text-orange-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900 line-clamp-2 max-w-[260px]">
                              {article.title_uz}
                            </p>
                            {article.view_count !== undefined && (
                              <p className="text-xs text-slate-400 mt-0.5">
                                {article.view_count.toLocaleString()} ko&apos;rishlar
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-4">
                        {article.category ? (
                          <span className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">
                            {article.category}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1">
                          {article.is_published ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 w-fit">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                              Nashr etilgan
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 w-fit">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              Qoralama
                            </span>
                          )}
                          {article.is_premium && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 w-fit">
                              Premium
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Audio player */}
                      <td className="px-4 py-4">
                        <AudioPlayerCell url={article.audio_url} />
                      </td>

                      {/* Date */}
                      <td className="px-4 py-4">
                        <span className="text-xs text-slate-500">{article.created_at}</span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link
                            href={`/articles/${article.id}/edit`}
                            title="Maqolani tahrirlash"
                            className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition-colors"
                          >
                            <Edit2 size={15} />
                          </Link>
                          <a
                            href={article.audio_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Audio manzilini ochish"
                            className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-orange-600 transition-colors"
                          >
                            <ExternalLink size={15} />
                          </a>
                          <button
                            onClick={() => setDeleteConfirm(article.id)}
                            title="Audioyi o'chirish"
                            className="p-1.5 rounded hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={15} />
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
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setDeleteConfirm(null)}
          />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-base font-semibold text-slate-900">Audio versiyani o&apos;chirish</h3>
            <p className="text-sm text-slate-600 mt-2">
              Maqolaning audio versiyasi o&apos;chiriladi. Maqolaning o&apos;zi saqlanib qoladi.
              Davom etasizmi?
            </p>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium transition-colors"
              >
                Bekor qilish
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-colors"
              >
                O&apos;chirish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
