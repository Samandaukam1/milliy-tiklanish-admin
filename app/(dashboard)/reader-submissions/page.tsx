'use client';

import { Header } from '@/components/header';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { ReaderSubmission, ReaderSubmissionStatus, Category } from '@/types';
import {
  Eye,
  X,
  CheckCircle,
  Clock,
  XCircle,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';

const STATUS_LABELS: Record<ReaderSubmissionStatus, string> = {
  new: 'Yangi',
  reviewing: "Ko'rib chiqilmoqda",
  transferred: "Maqolaga o'tkazilgan",
  rejected: 'Rad etilgan',
};

const STATUS_COLORS: Record<ReaderSubmissionStatus, string> = {
  new: 'bg-blue-100 text-blue-700',
  reviewing: 'bg-yellow-100 text-yellow-700',
  transferred: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

const DEMO_SUBMISSIONS: ReaderSubmission[] = [
  {
    id: '1',
    title: "O'zbekistonda yangi texnologiyalar rivojlanishi",
    anons: "Mamlakatimizda texnologiya sohasida katta o'zgarishlar ro'y bermoqda...",
    body: "Bugungi kunda O'zbekiston raqamli iqtisodiyotga o'tish yo'lida muhim qadamlar qo'ymoqda. IT sohasida minglab yoshlar ishga joylashmoqda...",
    cover_url: '',
    category_id: '1',
    author_name: 'Aziz Karimov',
    author_bio: "Toshkent shahri, IT mutaxassisi",
    phone: '+998901234567',
    telegram: '@azizkarimov',
    status: 'new',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    title: "Qishloq xo'jaligida yangi usullar",
    anons: "Fermerlar zamonaviy agrotexnologiyalardan foydalanmoqda...",
    body: "O'zbekiston qishloq xo'jaligida inqilobiy o'zgarishlar ro'y bermoqda...",
    cover_url: '',
    category_id: '2',
    author_name: 'Nodira Yusupova',
    author_bio: "Samarqand viloyati, dehqon",
    phone: '+998907654321',
    telegram: '@nodira_y',
    status: 'reviewing',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

const ARTICLE_IMAGE_COLUMN_CANDIDATES = [
  'featured_image_url',
  'cover_url',
  'image_url',
  'cover_image',
] as const;

const OPTIONAL_TRANSFER_COLUMNS = new Set<string>([
  'status',
  'source',
  'submission_id',
  'author_name',
  'author_bio_uz',
  'author_bio',
  'title',
  'anons',
  'body',
  ...ARTICLE_IMAGE_COLUMN_CANDIDATES,
]);

function getSupabaseErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }
  return 'Xatolik yuz berdi';
}

function extractMissingArticleColumn(errorMessage: string): string | null {
  const quotedMatch = errorMessage.match(/Could not find the '([^']+)' column of 'articles'/i);
  if (quotedMatch?.[1]) {
    return quotedMatch[1];
  }

  const plainMatch = errorMessage.match(/Could not find ([a-zA-Z0-9_]+) column of articles/i);
  return plainMatch?.[1] ?? null;
}

function generateSubmissionSlug(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9\u0400-\u04FF\u0041-\u007A]+/gi, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 200) +
    '-' +
    Date.now()
  );
}

async function createArticleFromSubmission(submission: ReaderSubmission): Promise<string> {
  const articlePayload: Record<string, unknown> = {
    slug: generateSubmissionSlug(submission.title),
    title_uz: submission.title,
    title_uz_cy: '',
    title_ru: '',
    title_en: '',
    summary_uz: submission.anons,
    summary_uz_cy: '',
    summary_ru: '',
    summary_en: '',
    content_uz: submission.body,
    content_uz_cy: '',
    content_ru: '',
    content_en: '',
    category_id: submission.category_id || null,
    is_premium: false,
    is_published: false,
    view_count: 0,
    status: 'draft',
    source: 'reader_submission',
    submission_id: submission.id,
    title: submission.title,
    anons: submission.anons,
    body: submission.body,
    ...(submission.author_name ? { author_name: submission.author_name } : {}),
    ...(submission.author_bio ? { author_bio_uz: submission.author_bio, author_bio: submission.author_bio } : {}),
  };

  if (submission.cover_url) {
    articlePayload[ARTICLE_IMAGE_COLUMN_CANDIDATES[0]] = submission.cover_url;
  }

  while (true) {
    const { data, error } = await supabase
      .from('articles')
      .insert([articlePayload])
      .select('id')
      .single();

    if (!error && data?.id) {
      if (submission.body.trim()) {
        const { error: blockError } = await supabase.from('article_blocks').insert([
          {
            article_id: data.id,
            sort_order: 0,
            type: 'paragraph',
            content: {
              type: 'paragraph',
              text_uz: submission.body,
              text_uz_cy: '',
              text_ru: '',
              text_en: '',
            },
          },
        ]);

        if (blockError) {
          await supabase.from('articles').delete().eq('id', data.id);
          throw new Error(getSupabaseErrorMessage(blockError));
        }
      }

      return data.id;
    }

    const errorMessage = getSupabaseErrorMessage(error);
    const missingColumn = extractMissingArticleColumn(errorMessage);

    if (!missingColumn) {
      throw new Error(errorMessage);
    }

    if ((ARTICLE_IMAGE_COLUMN_CANDIDATES as readonly string[]).includes(missingColumn)) {
      const currentIndex = ARTICLE_IMAGE_COLUMN_CANDIDATES.indexOf(
        missingColumn as (typeof ARTICLE_IMAGE_COLUMN_CANDIDATES)[number]
      );

      delete articlePayload[missingColumn];

      if (submission.cover_url) {
        const nextColumn = ARTICLE_IMAGE_COLUMN_CANDIDATES[currentIndex + 1];
        if (nextColumn) {
          articlePayload[nextColumn] = submission.cover_url;
        }
      }

      continue;
    }

    if (OPTIONAL_TRANSFER_COLUMNS.has(missingColumn)) {
      delete articlePayload[missingColumn];
      continue;
    }

    throw new Error(errorMessage);
  }
}

export default function ReaderSubmissionsPage() {
  const [submissions, setSubmissions] = useState<ReaderSubmission[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ReaderSubmission | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!isSupabaseConfigured()) {
        setSubmissions(DEMO_SUBMISSIONS);
        return;
      }
      const [subRes, catRes] = await Promise.all([
        supabase
          .from('reader_article_submissions')
          .select('*, category:categories(id,name_uz,name_uz_cy,name_ru,name_en,slug,sort_order,is_active,created_at)')
          .order('created_at', { ascending: false }),
        supabase.from('categories').select('*').order('name_uz'),
      ]);
      if (subRes.error) throw new Error(subRes.error.message);
      if (catRes.error) throw new Error(catRes.error.message);
      setSubmissions(subRes.data || []);
      setCategories(catRes.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (!cancelled) {
        void fetchData();
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const updateStatus = async (id: string, status: ReaderSubmissionStatus) => {
    if (!isSupabaseConfigured()) {
      setSubmissions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status } : s))
      );
      if (selected?.id === id) setSelected((prev) => prev ? { ...prev, status } : prev);
      return;
    }
    const { error: err } = await supabase
      .from('reader_article_submissions')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (err) throw new Error(err.message);
    setSubmissions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status } : s))
    );
    if (selected?.id === id) setSelected((prev) => prev ? { ...prev, status } : prev);
  };

  const handleStatusAction = async (id: string, status: ReaderSubmissionStatus) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await updateStatus(id, status);
      const label = STATUS_LABELS[status];
      setSuccessMsg(`Status yangilandi: ${label}`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Xatolik');
    } finally {
      setActionLoading(false);
    }
  };

  const markSubmissionTransferred = (submissionId: string, articleId: string) => {
    setSubmissions((prev) =>
      prev.map((s) =>
        s.id === submissionId
          ? { ...s, status: 'transferred', transferred_article_id: articleId }
          : s
      )
    );

    if (selected?.id === submissionId) {
      setSelected((prev) =>
        prev
          ? { ...prev, status: 'transferred', transferred_article_id: articleId }
          : prev
      );
    }
  };

  const handleTransfer = async (submission: ReaderSubmission) => {
    setActionLoading(true);
    setActionError(null);
    try {
      if (!isSupabaseConfigured()) {
        const demoArticleId = `demo-${Date.now()}`;
        markSubmissionTransferred(submission.id, demoArticleId);
        setSuccessMsg("Maqolalar bo'limiga muvaffaqiyatli yuborildi (demo)");
        setTimeout(() => setSuccessMsg(null), 4000);
        return;
      }

      const articleId = await createArticleFromSubmission(submission);

      // Update submission: mark transferred & save article id
      const { error: updateErr } = await supabase
        .from('reader_article_submissions')
        .update({
          status: 'transferred',
          transferred_article_id: articleId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', submission.id);

      if (updateErr) throw new Error(updateErr.message);

      markSubmissionTransferred(submission.id, articleId);

      setSuccessMsg("Maqolalar bo'limiga muvaffaqiyatli yuborildi!");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setActionError(getSupabaseErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('uz-UZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const getCategoryName = (sub: ReaderSubmission) => {
    if (sub.category) return sub.category.name_uz;
    const cat = categories.find((c) => c.id === sub.category_id);
    return cat ? cat.name_uz : sub.category_id || '—';
  };

  return (
    <div className="flex flex-col h-full">
      <Header
        title="O'quvchilardan kelgan maqolalar"
        subtitle="Kitobxonlar yuborgan maqolalarni ko'rib chiqing va tahririyatga yuboring"
      />

      <div className="flex-1 p-8 overflow-auto">
        {/* Success / error banners */}
        {successMsg && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-800">{successMsg}</p>
          </div>
        )}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start justify-between gap-3">
            <p className="text-sm text-red-800">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 flex-shrink-0">
              <X size={16} />
            </button>
          </div>
        )}

        {!isSupabaseConfigured() && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Demo rejim:</strong> Supabase sozlanmagan. Namuna ma&apos;lumotlar ko&apos;rsatilmoqda.
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
        ) : submissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 bg-white rounded-lg border border-slate-200 gap-3">
            <AlertCircle size={40} className="text-slate-300" />
            <p className="text-slate-600">Hozircha yuborilgan maqolalar yo&apos;q</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Muqova</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Sarlavha</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Kategoriya</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Muallif</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Telefon</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Telegram</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Sana</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {submissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      {sub.cover_url ? (
                        <div className="w-12 h-10 rounded overflow-hidden bg-slate-100 flex-shrink-0">
                          <Image
                            src={sub.cover_url}
                            alt={sub.title}
                            width={48}
                            height={40}
                            unoptimized
                            className="object-cover w-full h-full"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-10 rounded bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
                          Yo&apos;q
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900 text-sm line-clamp-2 max-w-[200px]">
                        {sub.title}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{getCategoryName(sub)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{sub.author_name}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{sub.phone || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{sub.telegram || '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[sub.status]}`}
                      >
                        {STATUS_LABELS[sub.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">{formatDate(sub.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => { setSelected(sub); setActionError(null); }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Eye size={14} />
                        Ko&apos;zdan kechirish
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setSelected(null)}
          />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 my-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Maqolani ko&apos;zdan kechirish</h2>
                <p className="text-sm text-slate-500 mt-0.5">Yuborilgan maqola tafsilotlari</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Status badge */}
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${STATUS_COLORS[selected.status]}`}
                >
                  {selected.status === 'transferred' && <CheckCircle size={14} />}
                  {selected.status === 'reviewing' && <Clock size={14} />}
                  {selected.status === 'rejected' && <XCircle size={14} />}
                  {selected.status === 'new' && <AlertCircle size={14} />}
                  {STATUS_LABELS[selected.status]}
                </span>
                {selected.status === 'transferred' && (
                  <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-700">
                    Maqolaga o&apos;tkazilgan
                  </span>
                )}
              </div>

              {/* Cover image */}
              {selected.cover_url && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Muqova rasmi</p>
                  <div className="rounded-lg overflow-hidden max-h-64">
                    <Image
                      src={selected.cover_url}
                      alt={selected.title}
                      width={800}
                      height={400}
                      unoptimized
                      className="object-cover w-full"
                    />
                  </div>
                </div>
              )}

              {/* Title */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Sarlavha</p>
                <p className="text-xl font-bold text-slate-900">{selected.title}</p>
              </div>

              {/* Category */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Kategoriya</p>
                <p className="text-slate-700">{getCategoryName(selected)}</p>
              </div>

              {/* Anons */}
              {selected.anons && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Anons (qisqacha)</p>
                  <p className="text-slate-700 bg-slate-50 p-3 rounded-lg text-sm leading-relaxed">{selected.anons}</p>
                </div>
              )}

              {/* Body */}
              {selected.body && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Maqola matni</p>
                  <div className="text-slate-700 bg-slate-50 p-4 rounded-lg text-sm leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {selected.body}
                  </div>
                </div>
              )}

              {/* Author info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Muallif ismi</p>
                  <p className="text-slate-700">{selected.author_name || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Telefon</p>
                  <p className="text-slate-700">{selected.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Telegram</p>
                  <p className="text-slate-700">{selected.telegram || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Yuborilgan sana</p>
                  <p className="text-slate-700">{formatDate(selected.created_at)}</p>
                </div>
              </div>

              {selected.author_bio && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Muallif haqida</p>
                  <p className="text-slate-700 text-sm">{selected.author_bio}</p>
                </div>
              )}
            </div>

            {/* Modal footer — actions */}
            <div className="p-6 border-t border-slate-200 space-y-3">
              {actionError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{actionError}</p>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                {/* Transfer to articles */}
                {selected.status !== 'transferred' && (
                  <button
                    onClick={() => handleTransfer(selected)}
                    disabled={actionLoading}
                    className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm disabled:opacity-50"
                  >
                    <ArrowRight size={16} />
                    {actionLoading ? 'Yuborilmoqda...' : "Maqolalar bo'limiga yuborish"}
                  </button>
                )}

                {/* Mark as reviewing */}
                {selected.status === 'new' && (
                  <button
                    onClick={() => handleStatusAction(selected.id, 'reviewing')}
                    disabled={actionLoading}
                    className="flex items-center gap-2 px-4 py-2.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-medium text-sm disabled:opacity-50"
                  >
                    <Clock size={16} />
                    Ko&apos;rib chiqilmoqda
                  </button>
                )}

                {/* Reject */}
                {selected.status !== 'rejected' && selected.status !== 'transferred' && (
                  <button
                    onClick={() => handleStatusAction(selected.id, 'rejected')}
                    disabled={actionLoading}
                    className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm disabled:opacity-50"
                  >
                    <XCircle size={16} />
                    Rad etish
                  </button>
                )}

                <button
                  onClick={() => setSelected(null)}
                  className="ml-auto px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium transition-colors"
                >
                  Yopish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
