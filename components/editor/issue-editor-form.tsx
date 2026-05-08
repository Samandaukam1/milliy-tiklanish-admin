'use client';

import { Header } from '@/components/header';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { uploadToStorage } from '@/lib/storage';
import { Issue } from '@/types';
import { ArrowLeft, Save, Upload, X, GripVertical, FileText } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface IssueFormData {
  title: string;
  cover_image_url?: string;
  cover_image_cy_url?: string;
  pdf_url?: string;
  publish_date: string;
}

const EMPTY_FORM: IssueFormData = {
  title: '',
  cover_image_url: undefined,
  cover_image_cy_url: undefined,
  pdf_url: undefined,
  publish_date: new Date().toISOString().split('T')[0],
};

interface IssueArticle {
  id: string;
  title_uz: string;
  issue_order: number;
}

function normalizeIssueId(issueId: string): string | number {
  return /^\d+$/.test(issueId) ? Number(issueId) : issueId;
}

async function fetchIssueArticles(issueId: string) {
  const normalizedIssueId = normalizeIssueId(issueId);

  const issueOrderResult = await supabase
    .from('articles')
    .select('id, title_uz, issue_order')
    .eq('issue_id', normalizedIssueId)
    .order('issue_order', { ascending: true });

  if (!issueOrderResult.error) {
    return {
      data: (issueOrderResult.data ?? []).map((article) => ({
        id: article.id,
        title_uz: article.title_uz,
        issue_order: article.issue_order ?? 0,
      })),
      orderColumn: 'issue_order' as const,
    };
  }

  const sortOrderResult = await supabase
    .from('articles')
    .select('id, title_uz, issue_sort_order')
    .eq('issue_id', normalizedIssueId)
    .order('issue_sort_order', { ascending: true });

  if (sortOrderResult.error) {
    throw new Error(sortOrderResult.error.message);
  }

  return {
    data: (sortOrderResult.data ?? []).map((article) => ({
      id: article.id,
      title_uz: article.title_uz,
      issue_order: article.issue_sort_order ?? 0,
    })),
    orderColumn: 'issue_sort_order' as const,
  };
}

function ImageUploadField({
  label,
  url,
  bucket,
  folder,
  onChange,
}: {
  label: string;
  url?: string;
  bucket: 'article-images';
  folder: string;
  onChange: (url: string | undefined) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const uploaded = await uploadToStorage(bucket, file, folder);
      onChange(uploaded);
    } catch {
      onChange(URL.createObjectURL(file));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
      {url ? (
        <div className="relative border border-slate-200 rounded-lg overflow-hidden group w-36">
          <img src={url} alt={label} className="w-full aspect-[3/4] object-cover" />
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="absolute top-1 right-1 p-1 bg-white rounded-full shadow text-slate-600 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-36 aspect-[3/4] border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/20 transition-colors text-xs disabled:opacity-50"
        >
          {uploading ? (
            <div className="animate-spin w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full" />
          ) : (
            <>
              <Upload size={20} />
              <span>Yuklash</span>
            </>
          )}
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
    </div>
  );
}

function PdfUploadField({ url, onChange }: { url?: string; onChange: (url: string | undefined) => void }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const uploaded = await uploadToStorage('issue-pdfs', file, 'issues');
      onChange(uploaded);
    } catch {
      onChange(URL.createObjectURL(file));
    } finally {
      setUploading(false);
    }
  };

  if (url) {
    return (
      <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
        <FileText size={20} className="text-red-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-red-700 truncate">PDF yuklangan</p>
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-red-500 hover:underline truncate block">
            Faylni ko&apos;rish
          </a>
        </div>
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="p-1 text-red-400 hover:text-red-700 transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => fileRef.current?.click()}
      disabled={uploading}
      className="w-full py-4 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-red-400 hover:text-red-500 hover:bg-red-50/20 transition-colors text-sm disabled:opacity-50"
    >
      {uploading ? (
        <div className="animate-spin w-6 h-6 border-2 border-red-200 border-t-red-600 rounded-full" />
      ) : (
        <>
          <FileText size={24} />
          <span>PDF fayl yuklash</span>
          <span className="text-xs text-slate-400">Maksimal: 100 MB</span>
        </>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
    </button>
  );
}

export default function IssueEditorPage({ issueId }: { issueId?: string }) {
  const router = useRouter();
  const [form, setForm] = useState<IssueFormData>(EMPTY_FORM);
  const [articles, setArticles] = useState<IssueArticle[]>([]);
  const [articleOrderColumn, setArticleOrderColumn] = useState<'issue_order' | 'issue_sort_order'>('issue_order');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!issueId);
  const isEdit = !!issueId;

  const onChange = <K extends keyof IssueFormData>(key: K, val: IssueFormData[K]) =>
    setForm((p) => ({ ...p, [key]: val }));

  useEffect(() => {
    if (!issueId) return;
    const load = async () => {
      if (!isSupabaseConfigured()) { setLoading(false); return; }
      const normalizedIssueId = normalizeIssueId(issueId);
      console.debug('[IssueEditorPage] issueId:', normalizedIssueId);
      const [issRes, artRes] = await Promise.all([
        supabase.from('issues').select('*').eq('id', normalizedIssueId).single(),
        fetchIssueArticles(issueId),
      ]);
      if (issRes.data) {
        const d = issRes.data as Issue & {
          // legacy column names that may exist on older databases
          cover_image_uz?: string;
          cover_image_uz_cy?: string;
        };
        setForm({
          title: d.title,
          cover_image_url: d.cover_image_url ?? d.cover_image_uz ?? undefined,
          cover_image_cy_url: d.cover_image_cy_url ?? d.cover_image_uz_cy ?? undefined,
          pdf_url: d.pdf_url,
          publish_date: d.publish_date ?? new Date().toISOString().split('T')[0],
        });
      }
      console.debug('[IssueEditorPage] fetched articles:', artRes.data);
      setArticles(artRes.data);
      setArticleOrderColumn(artRes.orderColumn);
      setLoading(false);
    };
    load();
  }, [issueId]);

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Sarlavha majburiy'); return; }
    setSaving(true);
    setError(null);

    const payload = {
      title: form.title,
      cover_image_url: form.cover_image_url ?? null,
      cover_image_cy_url: form.cover_image_cy_url ?? null,
      pdf_url: form.pdf_url ?? null,
      publish_date: form.publish_date || null,
      updated_at: new Date().toISOString(),
    };

    try {
      if (isSupabaseConfigured()) {
        if (isEdit) {
          const normalizedIssueId = normalizeIssueId(issueId!);
          const { error: e } = await supabase.from('issues').update(payload).eq('id', normalizedIssueId);
          if (e) throw new Error(e.message);

          await Promise.all(
            articles.map((a, idx) =>
              supabase.from('articles').update({ [articleOrderColumn]: idx }).eq('id', a.id)
            )
          );
        } else {
          const { error: e } = await supabase.from('issues').insert([payload]);
          if (e) throw new Error(e.message);
        }
      }
      router.push('/issues');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xatolik yuz berdi');
      setSaving(false);
    }
  };

  const moveArticle = useCallback((fromIdx: number, toIdx: number) => {
    setArticles((prev) => {
      const arr = [...prev];
      const [item] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, item);
      return arr;
    });
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <Header title={isEdit ? 'Sonni tahrirlash' : 'Yangi son'} />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header title={isEdit ? 'Sonni Tahrirlash' : 'Yangi Gazeta Soni'} />

      <div className="flex-1 p-8">
        <div className="flex items-center justify-between mb-6">
          <Link href="/issues" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm font-medium">
            <ArrowLeft size={18} />
            Orqaga
          </Link>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: main form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic info */}
            <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
              <h3 className="text-sm font-semibold text-slate-900">Asosiy ma&apos;lumotlar</h3>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Sarlavha <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => onChange('title', e.target.value)}
                  placeholder="2026 — 1-son"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nashr sanasi</label>
                <input
                  type="date"
                  value={form.publish_date}
                  onChange={(e) => onChange('publish_date', e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Cover images */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Muqova rasmlari</h3>
              <div className="flex gap-8">
                <ImageUploadField
                  label="Lotin (asosiy)"
                  url={form.cover_image_url}
                  bucket="article-images"
                  folder="issue-covers"
                  onChange={(url) => onChange('cover_image_url', url)}
                />
                <ImageUploadField
                  label="Kirill"
                  url={form.cover_image_cy_url}
                  bucket="article-images"
                  folder="issue-covers-cy"
                  onChange={(url) => onChange('cover_image_cy_url', url)}
                />
              </div>
            </div>

            {/* PDF */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">PDF fayl</h3>
              <PdfUploadField url={form.pdf_url} onChange={(url) => onChange('pdf_url', url)} />
            </div>
          </div>

          {/* Right: table of contents */}
          <div>
            <div className="bg-white rounded-lg border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Mundarija</h3>
              <p className="text-xs text-slate-500 mb-4">
                Maqolalarni sudrab tartiblang
              </p>

              {articles.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  <p>Hali maqola biriktirilmagan.</p>
                  <p className="mt-1 text-xs">Maqola tahrirlashda &quot;Gazeta soni&quot;ni tanlang.</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {articles.map((art, idx) => (
                    <li key={art.id} className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                      <GripVertical size={14} className="text-slate-400 flex-shrink-0 cursor-grab" />
                      <span className="flex-shrink-0 w-5 h-5 bg-slate-200 rounded-full text-xs font-bold text-slate-600 flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <Link href={`/articles/${art.id}/edit`} className="text-xs text-slate-700 hover:text-blue-600 flex-1 line-clamp-2 transition-colors">
                        {art.title_uz}
                      </Link>
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => idx > 0 && moveArticle(idx, idx - 1)}
                          disabled={idx === 0}
                          className="text-slate-400 hover:text-slate-700 disabled:opacity-30 text-xs leading-none"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => idx < articles.length - 1 && moveArticle(idx, idx + 1)}
                          disabled={idx === articles.length - 1}
                          className="text-slate-400 hover:text-slate-700 disabled:opacity-30 text-xs leading-none"
                        >
                          ▼
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
