'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { BarChart3, FileText, Video, Mic } from 'lucide-react';
import { Header } from '@/components/header';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface Stats {
  totalArticles: number;
  publishedArticles: number;
  totalMedia: number;
  totalAudio: number;
}

interface RecentArticle {
  id: string;
  title_uz: string;
  is_published: boolean;
  created_at: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ totalArticles: 0, publishedArticles: 0, totalMedia: 0, totalAudio: 0 });
  const [recent, setRecent] = useState<RecentArticle[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      // Demo stats
      setStats({ totalArticles: 24, publishedArticles: 18, totalMedia: 12, totalAudio: 5 });
      setRecent([
        { id: '1', title_uz: "O'zbekiston yangiliklari", is_published: true, created_at: new Date().toISOString() },
        { id: '2', title_uz: 'Jahon iqtisodiyoti', is_published: true, created_at: new Date(Date.now() - 3600000).toISOString() },
        { id: '3', title_uz: 'Sport yangiliklari', is_published: false, created_at: new Date(Date.now() - 7200000).toISOString() },
        { id: '4', title_uz: 'Madaniyat va san\'at', is_published: true, created_at: new Date(Date.now() - 10800000).toISOString() },
        { id: '5', title_uz: 'Texnologiya yangiliklari', is_published: false, created_at: new Date(Date.now() - 14400000).toISOString() },
      ]);
      setLoading(false);
      return;
    }

    const [articlesRes, publishedRes, mediaRes, audioRes, recentRes] = await Promise.all([
      supabase.from('articles').select('id', { count: 'exact', head: true }),
      supabase.from('articles').select('id', { count: 'exact', head: true }).eq('is_published', true),
      supabase.from('media_videos').select('id', { count: 'exact', head: true }),
      supabase.from('articles').select('id', { count: 'exact', head: true }).not('audio_url', 'is', null),
      supabase.from('articles').select('id, title_uz, is_published, created_at').order('created_at', { ascending: false }).limit(5),
    ]);

    setStats({
      totalArticles: articlesRes.count ?? 0,
      publishedArticles: publishedRes.count ?? 0,
      totalMedia: mediaRes.count ?? 0,
      totalAudio: audioRes.count ?? 0,
    });
    setRecent(recentRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (!cancelled) {
        void fetchStats();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [fetchStats]);

  const formatRecentDate = (dateString: string) =>
    new Intl.DateTimeFormat('uz-UZ', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));

  const statCards = [
    { label: 'Jami Maqolalar', value: stats.totalArticles, icon: FileText, color: 'blue', sub: `${stats.publishedArticles} ta chiqarilgan`, href: '/articles' },
    { label: 'Chiqarilgan', value: stats.publishedArticles, icon: BarChart3, color: 'green', sub: 'Aktiv maqolalar', href: '/articles' },
    { label: 'Media Videolar', value: stats.totalMedia, icon: Video, color: 'purple', sub: 'Short va long', href: '/media' },
    { label: 'Audio Versiyalar', value: stats.totalAudio, icon: Mic, color: 'orange', sub: 'Tahririyat radiosi', href: '/audio' },
  ];

  const colorMap: Record<string, { bg: string; icon: string }> = {
    blue: { bg: 'bg-blue-100', icon: 'text-blue-600' },
    green: { bg: 'bg-green-100', icon: 'text-green-600' },
    purple: { bg: 'bg-purple-100', icon: 'text-purple-600' },
    orange: { bg: 'bg-orange-100', icon: 'text-orange-600' },
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Dashboard" subtitle="Bosh sahifa — Xush kelibsiz admin paneliga" />

      <div className="flex-1 p-8">
        {!isSupabaseConfigured() && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Demo rejim:</strong> Supabase sozlanmagan. Namuna ma&apos;lumotlar ko&apos;rsatilmoqda.
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map(({ label, value, icon: Icon, color, sub, href }) => {
            const { bg, icon } = colorMap[color];
            return (
              <Link key={label} href={href} className="block bg-white rounded-lg border border-slate-200 p-6 hover:border-slate-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-600 text-sm font-medium">{label}</p>
                    {loading ? (
                      <div className="w-16 h-8 bg-slate-100 rounded animate-pulse mt-2" />
                    ) : (
                      <p className="text-3xl font-bold text-slate-900 mt-2">{value}</p>
                    )}
                  </div>
                  <div className={`w-12 h-12 rounded-lg ${bg} flex items-center justify-center`}>
                    <Icon size={24} className={icon} />
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-4">{sub}</p>
              </Link>
            );
          })}
        </div>

        {/* Recent articles */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900">So&apos;nggi Maqolalar</h2>
            <Link href="/articles" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Barchasini ko&apos;rish →
            </Link>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 pb-4 border-b border-slate-100">
                  <div className="w-10 h-10 rounded-full bg-slate-100 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-100 rounded animate-pulse w-2/3" />
                    <div className="h-2 bg-slate-100 rounded animate-pulse w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : recent.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-500 text-sm">Hali maqola yo&apos;q</p>
              <Link href="/articles/new" className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-700 font-medium">
                Birinchi maqolani qo&apos;shing →
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {recent.map((article) => (
                <div key={article.id} className="flex items-center gap-4 pb-4 border-b border-slate-100 last:border-b-0 last:pb-0">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <FileText size={16} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{article.title_uz}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{formatRecentDate(article.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                      article.is_published ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {article.is_published ? 'Nashr' : 'Qoralama'}
                    </span>
                    <Link
                      href={`/articles/${article.id}/edit`}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Tahrirlash
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

