'use client';

import { Header } from '@/components/header';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Issue } from '@/types';
import { Plus, Edit2, Trash2, FileText, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function IssuesPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchIssues = async () => {
    setLoading(true);
    setError(null);
    if (!isSupabaseConfigured()) {
      setIssues([
        {
          id: '1',
          title: '2026 — 1-son',
          publish_date: '2026-01-01',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);
      setLoading(false);
      return;
    }
    const { data, error: e } = await supabase
      .from('issues')
      .select('*')
      .order('publish_date', { ascending: false });
    if (e) setError(e.message);
    else setIssues(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchIssues(); }, []);

  const handleDelete = async (id: string) => {
    if (!isSupabaseConfigured()) { setIssues((prev) => prev.filter((i) => i.id !== id)); setDeleteConfirm(null); return; }
    setDeleting(true);
    await supabase.from('issues').delete().eq('id', id);
    setDeleting(false);
    setDeleteConfirm(null);
    fetchIssues();
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Gazeta Sonlari" subtitle="Barcha nashr sonlarini boshqaring" />

      <div className="flex-1 p-8">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-slate-500">{issues.length} ta son</p>
          <Link
            href="/issues/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
          >
            <Plus size={16} />
            Yangi son
          </Link>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full" />
          </div>
        ) : issues.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <FileText size={40} className="mx-auto mb-3 opacity-30" />
            <p>Hali gazeta soni yaratilmagan</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {issues.map((issue) => (
              <div key={issue.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                {/* Cover image */}
                <div className="aspect-[3/4] bg-slate-100 relative">
                  {issue.cover_image_url ? (
                    <img src={issue.cover_image_url} alt={issue.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <FileText size={48} />
                    </div>
                  )}
                  {issue.pdf_url && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 bg-red-600 text-white text-xs rounded font-medium">PDF</span>
                  )}
                </div>

                <div className="p-4">
                  <p className="font-semibold text-slate-900 text-sm line-clamp-2">{issue.title}</p>
                  {issue.publish_date && (
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(issue.publish_date).toLocaleDateString('uz-UZ')}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                    <Link
                      href={`/issues/${issue.id}/edit`}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <Edit2 size={13} />
                      Tahrirlash
                    </Link>
                    {deleteConfirm === issue.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(issue.id)}
                          disabled={deleting}
                          className="px-2 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                          Ha
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="p-1.5 text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(issue.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 border border-slate-200 rounded-lg transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
