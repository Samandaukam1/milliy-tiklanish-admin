'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Zap,
  User,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  RefreshCw,
  Save,
  Edit2,
  Globe,
  MapPin,
  Check,
  AlertCircle,
  Loader2,
  X,
  WandSparkles,
  Image as ImageIcon,
  Newspaper,
  FileText,
  ExternalLink,
  Info,
} from 'lucide-react';
import clsx from 'clsx';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Header } from '@/components/header';
import type {
  APIGeneratedArticle,
  GenerationMode,
  RegionFilter,
} from '@/app/api/milliy-ai/generate/route';
import type { GeneratedNews, NewsSource } from '@/app/api/milliy-ai/news/route';
import type { ContentBlock } from '@/types/blocks';

// ── Constants ──────────────────────────────────────────────────────────────────

type GenType = 'article' | 'news';

const CATEGORIES = [
  { value: '', label: 'AI tanlaydi' },
  { value: 'siyosat', label: 'Siyosat' },
  { value: 'iqtisodiyot', label: 'Iqtisodiyot' },
  { value: 'jamiyat', label: 'Jamiyat' },
  { value: 'texnologiya', label: 'Texnologiya' },
  { value: 'sport', label: 'Sport' },
  { value: 'madaniyat', label: 'Madaniyat' },
  { value: 'talim', label: "Ta'lim" },
  { value: 'sogliq', label: "Sog'liq" },
  { value: 'boshqa', label: 'Boshqa' },
];

const ARTICLE_COUNTS = [1, 2, 3, 5];

const REGIONS: { value: RegionFilter; label: string; icon: React.ReactNode }[] = [
  { value: 'uzbekistan', label: "O'zbekiston", icon: <MapPin size={14} /> },
  { value: 'world', label: 'Jahon', icon: <Globe size={14} /> },
  { value: 'mixed', label: 'Aralash', icon: <WandSparkles size={14} /> },
];

const CATEGORY_LABELS: Record<string, string> = {
  siyosat: 'Siyosat',
  iqtisodiyot: 'Iqtisodiyot',
  jamiyat: 'Jamiyat',
  texnologiya: 'Texnologiya',
  sport: 'Sport',
  madaniyat: 'Madaniyat',
  talim: "Ta'lim",
  sogliq: "Sog'liq",
  boshqa: 'Boshqa',
};

// ── Local types ────────────────────────────────────────────────────────────────

interface SavedStyle {
  id: string;
  name: string;
  text: string;
  created_at: string;
}

interface BaseCard {
  cid: string;
  savedId?: string;
  savingState: 'idle' | 'saving' | 'saved' | 'error';
  saveError?: string;
  regenLoading: boolean;
}

interface ArticleCard extends BaseCard {
  kind: 'article';
  data: APIGeneratedArticle;
}

interface NewsCard extends BaseCard {
  kind: 'news';
  data: GeneratedNews;
}

type AnyCard = ArticleCard | NewsCard;

// ── localStorage helpers ───────────────────────────────────────────────────────

const STYLES_KEY = 'milliy_ai_styles';

function loadStyles(): SavedStyle[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STYLES_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function persistStyles(styles: SavedStyle[]) {
  localStorage.setItem(STYLES_KEY, JSON.stringify(styles));
}

// ── Supabase helpers ───────────────────────────────────────────────────────────

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[''ʼ`]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-');
}

async function ensureUniqueSlug(base: string): Promise<string> {
  const { data } = await supabase
    .from('articles')
    .select('slug')
    .eq('slug', base)
    .maybeSingle();
  if (!data) return base;
  return `${base}-${Date.now().toString(36)}`;
}

function buildBlocks(
  paragraphs_uz: string[],
  paragraphs_uz_cy: string[],
  paragraphs_ru: string[],
  paragraphs_en: string[]
): ContentBlock[] {
  const len = Math.max(
    paragraphs_uz?.length ?? 0,
    paragraphs_uz_cy?.length ?? 0,
    paragraphs_ru?.length ?? 0,
    paragraphs_en?.length ?? 0
  );
  return Array.from({ length: len }, (_, i) => ({
    id: crypto.randomUUID(),
    type: 'paragraph' as const,
    text_uz: paragraphs_uz?.[i] ?? '',
    text_uz_cy: paragraphs_uz_cy?.[i] ?? '',
    text_ru: paragraphs_ru?.[i] ?? '',
    text_en: paragraphs_en?.[i] ?? '',
  }));
}

async function saveToSupabase(
  title_uz: string,
  title_uz_cy: string,
  title_ru: string,
  title_en: string,
  summary_uz: string,
  summary_uz_cy: string,
  summary_ru: string,
  summary_en: string,
  paragraphs_uz: string[],
  paragraphs_uz_cy: string[],
  paragraphs_ru: string[],
  paragraphs_en: string[]
): Promise<string> {
  const blocks = buildBlocks(paragraphs_uz, paragraphs_uz_cy, paragraphs_ru, paragraphs_en);
  const baseSlug = generateSlug(title_uz) || `milliy-ai-${Date.now().toString(36)}`;
  const slug = isSupabaseConfigured() ? await ensureUniqueSlug(baseSlug) : baseSlug;

  const payload = {
    slug,
    title_uz,
    title_uz_cy,
    title_ru,
    title_en,
    summary_uz,
    summary_uz_cy,
    summary_ru,
    summary_en,
    content_uz: blocks[0]?.text_uz ?? '',
    content_uz_cy: blocks[0]?.text_uz_cy ?? '',
    content_ru: blocks[0]?.text_ru ?? '',
    content_en: blocks[0]?.text_en ?? '',
    category_id: null,
    is_premium: false,
    is_published: false,
  };

  const { data, error } = await supabase
    .from('articles')
    .insert([payload])
    .select('id')
    .single();
  if (error) throw new Error(error.message);

  if (blocks.length > 0 && data?.id) {
    const blockRows = blocks.map((block, idx) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, ...rest } = block;
      return { article_id: data.id, sort_order: idx, type: block.type, content: rest };
    });
    const { error: bErr } = await supabase.from('article_blocks').insert(blockRows);
    if (bErr) throw new Error(bErr.message);
  }

  return data.id as string;
}

// ── Mode options ───────────────────────────────────────────────────────────────

interface ModeOption {
  value: GenerationMode;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  activeClass: string;
  hoverClass: string;
}

const MODES: ModeOption[] = [
  {
    value: 'PRO',
    label: 'Milliy Tiklanish PRO',
    sublabel: 'Chuqur tahlil, professional jurnalistika',
    icon: <Sparkles size={19} />,
    activeClass: 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-300',
    hoverClass: 'hover:border-indigo-300',
  },
  {
    value: 'TEZ',
    label: 'Milliy Tiklanish TEZ',
    sublabel: "Qisqa, tez o'qiladi, lo'nda",
    icon: <Zap size={19} />,
    activeClass: 'border-amber-500 bg-amber-50 text-amber-700 ring-1 ring-amber-300',
    hoverClass: 'hover:border-amber-300',
  },
  {
    value: 'MENING',
    label: 'Mening uslubim',
    sublabel: 'Shaxsiy uslubda yozish',
    icon: <User size={19} />,
    activeClass: 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300',
    hoverClass: 'hover:border-emerald-300',
  },
];

// ── Main page ──────────────────────────────────────────────────────────────────

export default function MilliyAIPage() {
  const router = useRouter();

  // Generation type
  const [genType, setGenType] = useState<GenType>('article');

  // Shared form
  const [articleCount, setArticleCount] = useState(3);
  const [region, setRegion] = useState<RegionFilter>('mixed');
  const [category, setCategory] = useState('');
  const [noTopicMode, setNoTopicMode] = useState(false);
  const [topic, setTopic] = useState('');

  // Article-only form
  const [mode, setMode] = useState<GenerationMode>('PRO');
  const [styleText, setStyleText] = useState('');

  // Saved styles
  const [savedStyles, setSavedStyles] = useState<SavedStyle[]>([]);
  const [showStylesDropdown, setShowStylesDropdown] = useState(false);
  const [showStyleSavePanel, setShowStyleSavePanel] = useState(false);
  const [newStyleName, setNewStyleName] = useState('');
  const stylesDropdownRef = useRef<HTMLDivElement>(null);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [cards, setCards] = useState<AnyCard[]>([]);
  const [lastGenType, setLastGenType] = useState<GenType | null>(null);

  useEffect(() => {
    setSavedStyles(loadStyles());
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (stylesDropdownRef.current && !stylesDropdownRef.current.contains(e.target as Node)) {
        setShowStylesDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ── API calls ────────────────────────────────────────────────────────────────

  async function callArticleAPI(regenNewsType?: 'uzbekistan' | 'world'): Promise<APIGeneratedArticle[]> {
    const body = {
      mode,
      articleCount: regenNewsType ? 1 : articleCount,
      region,
      category: category || undefined,
      topic: noTopicMode ? undefined : topic.trim() || undefined,
      noTopicMode: noTopicMode || !topic.trim(),
      styleText: mode === 'MENING' ? styleText.trim() || undefined : undefined,
      regenNewsType,
    };
    const res = await fetch('/api/milliy-ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? 'Server xatoligi');
    if (!Array.isArray(json.articles) || json.articles.length === 0)
      throw new Error('Maqolalar yaratilmadi.');
    return json.articles;
  }

  async function callNewsAPI(regenNewsType?: 'uzbekistan' | 'world'): Promise<GeneratedNews[]> {
    const body = {
      articleCount: regenNewsType ? 1 : articleCount,
      region,
      category: category || undefined,
      topic: noTopicMode ? undefined : topic.trim() || undefined,
      noTopicMode: noTopicMode || !topic.trim(),
      regenNewsType,
    };
    const res = await fetch('/api/milliy-ai/news', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? 'Server xatoligi');
    if (!Array.isArray(json.articles) || json.articles.length === 0)
      throw new Error('Xabarlar yaratilmadi.');
    return json.articles;
  }

  // ── Generate handler ─────────────────────────────────────────────────────────

  async function handleGenerate() {
    if (generating) return;
    setGenerating(true);
    setGenerateError(null);
    try {
      if (genType === 'article') {
        const result = await callArticleAPI();
        setCards(result.map((d) => ({ kind: 'article', cid: crypto.randomUUID(), data: d, savingState: 'idle', regenLoading: false })));
      } else {
        const result = await callNewsAPI();
        setCards(result.map((d) => ({ kind: 'news', cid: crypto.randomUUID(), data: d, savingState: 'idle', regenLoading: false })));
      }
      setLastGenType(genType);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Xatolik yuz berdi');
    } finally {
      setGenerating(false);
    }
  }

  // ── Regen handler ────────────────────────────────────────────────────────────

  async function handleRegen(cid: string) {
    const card = cards.find((c) => c.cid === cid);
    if (!card || card.regenLoading || generating) return;
    setCards((prev) => prev.map((c) => (c.cid === cid ? { ...c, regenLoading: true } : c)));
    try {
      if (card.kind === 'article') {
        const result = await callArticleAPI(card.data.news_type);
        const newData = result[0];
        setCards((prev) =>
          prev.map((c) =>
            c.cid === cid
              ? { kind: 'article', cid: crypto.randomUUID(), data: newData, savingState: 'idle', regenLoading: false }
              : c
          )
        );
      } else {
        const result = await callNewsAPI(card.data.news_type);
        const newData = result[0];
        setCards((prev) =>
          prev.map((c) =>
            c.cid === cid
              ? { kind: 'news', cid: crypto.randomUUID(), data: newData, savingState: 'idle', regenLoading: false }
              : c
          )
        );
      }
    } catch (err) {
      setCards((prev) =>
        prev.map((c) =>
          c.cid === cid
            ? { ...c, regenLoading: false, savingState: 'error', saveError: err instanceof Error ? err.message : 'Xatolik' }
            : c
        )
      );
    }
  }

  // ── Save handler ─────────────────────────────────────────────────────────────

  async function handleSave(cid: string) {
    const card = cards.find((c) => c.cid === cid);
    if (!card || card.savingState === 'saving' || card.savingState === 'saved') return;
    setCards((prev) => prev.map((c) => (c.cid === cid ? { ...c, savingState: 'saving', saveError: undefined } : c)));
    try {
      if (!isSupabaseConfigured()) {
        await new Promise((r) => setTimeout(r, 700));
        setCards((prev) => prev.map((c) => (c.cid === cid ? { ...c, savingState: 'saved', savedId: 'demo' } : c)));
        return;
      }
      const d = card.data;
      const savedId = await saveToSupabase(
        d.title_uz, d.title_uz_cy, d.title_ru, d.title_en,
        d.summary_uz, d.summary_uz_cy, d.summary_ru, d.summary_en,
        d.paragraphs_uz, d.paragraphs_uz_cy, d.paragraphs_ru, d.paragraphs_en
      );
      setCards((prev) => prev.map((c) => (c.cid === cid ? { ...c, savingState: 'saved', savedId } : c)));
    } catch (err) {
      setCards((prev) =>
        prev.map((c) =>
          c.cid === cid
            ? { ...c, savingState: 'error', saveError: err instanceof Error ? err.message : 'Saqlashda xatolik' }
            : c
        )
      );
    }
  }

  // ── Edit handler ─────────────────────────────────────────────────────────────

  async function handleEdit(cid: string) {
    const card = cards.find((c) => c.cid === cid);
    if (!card) return;
    if (card.savedId && card.savedId !== 'demo') {
      router.push(`/articles/${card.savedId}/edit`);
      return;
    }
    setCards((prev) => prev.map((c) => (c.cid === cid ? { ...c, savingState: 'saving', saveError: undefined } : c)));
    try {
      if (!isSupabaseConfigured()) { router.push('/articles/new'); return; }
      const d = card.data;
      const savedId = await saveToSupabase(
        d.title_uz, d.title_uz_cy, d.title_ru, d.title_en,
        d.summary_uz, d.summary_uz_cy, d.summary_ru, d.summary_en,
        d.paragraphs_uz, d.paragraphs_uz_cy, d.paragraphs_ru, d.paragraphs_en
      );
      setCards((prev) => prev.map((c) => (c.cid === cid ? { ...c, savingState: 'saved', savedId } : c)));
      router.push(`/articles/${savedId}/edit`);
    } catch (err) {
      setCards((prev) =>
        prev.map((c) =>
          c.cid === cid
            ? { ...c, savingState: 'error', saveError: err instanceof Error ? err.message : 'Xatolik' }
            : c
        )
      );
    }
  }

  // ── Style management ─────────────────────────────────────────────────────────

  function handleSaveStyle() {
    const name = newStyleName.trim();
    const text = styleText.trim();
    if (!name || !text) return;
    const s: SavedStyle = { id: crypto.randomUUID(), name, text, created_at: new Date().toISOString() };
    const updated = [...savedStyles, s];
    setSavedStyles(updated);
    persistStyles(updated);
    setNewStyleName('');
    setShowStyleSavePanel(false);
  }

  function handleDeleteStyle(id: string) {
    const updated = savedStyles.filter((s) => s.id !== id);
    setSavedStyles(updated);
    persistStyles(updated);
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const btnLabel =
    genType === 'article'
      ? `${articleCount} ta maqola yaratish`
      : `${articleCount} ta xabar tayyorlash`;

  return (
    <div className="flex flex-col h-full">
      <Header title="Milliy AI" subtitle="AI yordamida maqolalar va xabarlar yaratish" />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-6 space-y-5">

          {/* ── Generation type selector ── */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setGenType('article')}
              className={clsx(
                'flex items-center gap-3 px-5 py-4 rounded-2xl border-2 text-left transition-all',
                genType === 'article'
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-800 shadow-sm'
                  : 'border-slate-200 text-slate-600 hover:border-indigo-300 bg-white'
              )}
            >
              <div className={clsx('p-2 rounded-xl', genType === 'article' ? 'bg-indigo-100' : 'bg-slate-100')}>
                <FileText size={20} className={genType === 'article' ? 'text-indigo-600' : 'text-slate-500'} />
              </div>
              <div>
                <div className="font-bold text-sm">Maqola yaratish</div>
                <div className="text-xs opacity-60 mt-0.5">Tahliliy va editorial maqolalar</div>
              </div>
            </button>

            <button
              onClick={() => setGenType('news')}
              className={clsx(
                'flex items-center gap-3 px-5 py-4 rounded-2xl border-2 text-left transition-all',
                genType === 'news'
                  ? 'border-rose-500 bg-rose-50 text-rose-800 shadow-sm'
                  : 'border-slate-200 text-slate-600 hover:border-rose-300 bg-white'
              )}
            >
              <div className={clsx('p-2 rounded-xl', genType === 'news' ? 'bg-rose-100' : 'bg-slate-100')}>
                <Newspaper size={20} className={genType === 'news' ? 'text-rose-600' : 'text-slate-500'} />
              </div>
              <div>
                <div className="font-bold text-sm">Xabar tayyorlash</div>
                <div className="text-xs opacity-60 mt-0.5">Faktga asoslangan yangiliklar</div>
              </div>
            </button>
          </div>

          {/* ── News disclaimer ── */}
          {genType === 'news' && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
              <Info size={15} className="mt-0.5 shrink-0" />
              <span>
                AI o&apos;z bilim bazasidagi eng yangi ma&apos;lumotlarni ishlatadi. Manbalar havolalarini chop etishdan avval tekshirib chiqing.
              </span>
            </div>
          )}

          {/* ── Article mode selector (only for articles) ── */}
          {genType === 'article' && (
            <Card title="Yozish rejimi">
              <div className="grid grid-cols-3 gap-3">
                {MODES.map((m) => {
                  const active = mode === m.value;
                  return (
                    <button
                      key={m.value}
                      onClick={() => setMode(m.value)}
                      className={clsx(
                        'flex flex-col gap-1.5 p-4 rounded-xl border-2 text-left transition-all',
                        active ? m.activeClass : `border-slate-200 text-slate-600 ${m.hoverClass}`
                      )}
                    >
                      <span className={clsx(active ? '' : 'text-slate-400')}>{m.icon}</span>
                      <span className="font-semibold text-sm leading-tight">{m.label}</span>
                      <span className="text-xs opacity-70 leading-snug">{m.sublabel}</span>
                    </button>
                  );
                })}
              </div>
            </Card>
          )}

          {/* ── Options row ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Kategoriya
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Count */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                {genType === 'article' ? 'Maqolalar soni' : 'Xabarlar soni'}
              </label>
              <div className="flex gap-2">
                {ARTICLE_COUNTS.map((n) => (
                  <button
                    key={n}
                    onClick={() => setArticleCount(n)}
                    className={clsx(
                      'flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all',
                      articleCount === n
                        ? genType === 'news'
                          ? 'border-rose-500 bg-rose-50 text-rose-700'
                          : 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Region */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Hudud
              </label>
              <div className="flex gap-2">
                {REGIONS.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setRegion(r.value)}
                    className={clsx(
                      'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all',
                      region === r.value
                        ? genType === 'news'
                          ? 'border-rose-500 bg-rose-50 text-rose-700'
                          : 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    )}
                  >
                    {r.icon}
                    <span>{r.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Topic section ── */}
          <Card title="Mavzu">
            <div className="flex items-center gap-3 mb-4">
              <button
                type="button"
                onClick={() => setNoTopicMode(false)}
                className={clsx(
                  'flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-all',
                  !noTopicMode
                    ? genType === 'news'
                      ? 'border-rose-500 bg-rose-50 text-rose-700'
                      : 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                )}
              >
                Mavzu kiriting
              </button>
              <button
                type="button"
                onClick={() => setNoTopicMode(true)}
                className={clsx(
                  'flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-all',
                  noTopicMode
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                )}
              >
                <span className="flex items-center justify-center gap-1.5">
                  <WandSparkles size={13} />
                  AI o&apos;zi tanlaydi
                </span>
              </button>
            </div>

            {!noTopicMode ? (
              <div>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder={
                    genType === 'news'
                      ? "Masalan: Toshkentdagi suv toshqini, FIFA 2026, Prezident farmon..."
                      : "Masalan: O'zbekiston iqtisodiyoti, sun'iy intellekt, Toshkent metro..."
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm placeholder:text-slate-400"
                />
                <p className="text-xs text-slate-400 mt-1.5">
                  Bo&apos;sh qoldirsangiz ham ishlaydi — AI o&apos;zi mavzu tanlaydi
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700">
                <WandSparkles size={15} className="mt-0.5 shrink-0" />
                <span>
                  AI mustaqil ravishda{' '}
                  {genType === 'news'
                    ? 'hozirgi trend va dolzarb yangiliklar mavzusini tanlaydi'
                    : 'hozirgi trend va dolzarb mavzularni tanlaydi'}
                  {category ? `. Kategoriya: "${CATEGORY_LABELS[category] ?? category}"` : ''}
                  {region !== 'mixed' ? `. Hudud: ${region === 'uzbekistan' ? "O'zbekiston" : 'Jahon'}` : ''}.
                </span>
              </div>
            )}
          </Card>

          {/* ── Mening uslubim (articles only) ── */}
          {genType === 'article' && mode === 'MENING' && (
            <Card title="Mening uslubim — namuna matn">
              {savedStyles.length > 0 && (
                <div className="relative mb-3" ref={stylesDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowStylesDropdown((v) => !v)}
                    className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-700 hover:border-emerald-400 transition-colors"
                  >
                    <span className="text-slate-500">Saqlangan uslubdan tanlash...</span>
                    <ChevronDown size={15} className="text-slate-400" />
                  </button>
                  {showStylesDropdown && (
                    <div className="absolute z-20 mt-1 w-full bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
                      {savedStyles.map((s) => (
                        <div key={s.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 group">
                          <button
                            type="button"
                            className="flex-1 text-left text-sm text-slate-700"
                            onClick={() => { setStyleText(s.text); setShowStylesDropdown(false); }}
                          >
                            {s.name}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDeleteStyle(s.id); }}
                            className="p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <textarea
                value={styleText}
                onChange={(e) => setStyleText(e.target.value)}
                placeholder="Bu yerga o'z uslubingizdagi maqola yoki parchani yozing. AI shu uslubni o'rganib, yangi maqolalarni xuddi shunday yozadi..."
                rows={6}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm placeholder:text-slate-400 resize-y"
              />

              {styleText.trim() && !showStyleSavePanel && (
                <button
                  type="button"
                  onClick={() => setShowStyleSavePanel(true)}
                  className="mt-2 flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  <Plus size={14} />
                  Bu uslubni saqlash
                </button>
              )}

              {showStyleSavePanel && (
                <div className="flex gap-2 items-center mt-2">
                  <input
                    type="text"
                    value={newStyleName}
                    onChange={(e) => setNewStyleName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveStyle()}
                    placeholder="Uslub nomi (masalan: Rasmiy, Sport, Tahlil)"
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleSaveStyle}
                    disabled={!newStyleName.trim()}
                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Saqlash
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowStyleSavePanel(false); setNewStyleName(''); }}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500"
                  >
                    <X size={15} />
                  </button>
                </div>
              )}
            </Card>
          )}

          {/* ── Generate button ── */}
          <div className="flex justify-center pt-1">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className={clsx(
                'flex items-center gap-3 px-9 py-4 rounded-2xl text-white font-bold text-base shadow-lg transition-all',
                generating
                  ? 'cursor-not-allowed opacity-60 bg-slate-400'
                  : genType === 'news'
                  ? 'bg-rose-600 hover:bg-rose-700 hover:shadow-xl active:scale-95'
                  : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-xl active:scale-95'
              )}
            >
              {generating ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  {genType === 'news' ? 'Xabarlar tayyorlanmoqda...' : 'Maqolalar yaratilmoqda...'}
                </>
              ) : genType === 'news' ? (
                <>
                  <Newspaper size={20} />
                  {btnLabel}
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  {btnLabel}
                </>
              )}
            </button>
          </div>

          {/* ── Error ── */}
          {generateError && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
              <AlertCircle size={17} className="mt-0.5 shrink-0" />
              <span>{generateError}</span>
            </div>
          )}

          {/* ── Results ── */}
          {cards.length > 0 && (
            <section className="space-y-4 pt-2">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-slate-800">
                  {lastGenType === 'news' ? 'Tayyorlangan xabarlar' : 'Yaratilgan maqolalar'}
                  <span className="ml-2 text-sm font-normal text-slate-400">({cards.length} ta)</span>
                </h2>
              </div>

              {cards.map((card) =>
                card.kind === 'article' ? (
                  <ArticleResultCard
                    key={card.cid}
                    card={card}
                    onSave={() => handleSave(card.cid)}
                    onEdit={() => handleEdit(card.cid)}
                    onRegen={() => handleRegen(card.cid)}
                    globalGenerating={generating}
                  />
                ) : (
                  <NewsResultCard
                    key={card.cid}
                    card={card}
                    onSave={() => handleSave(card.cid)}
                    onEdit={() => handleEdit(card.cid)}
                    onRegen={() => handleRegen(card.cid)}
                    globalGenerating={generating}
                  />
                )
              )}
            </section>
          )}

          <div className="h-6" />
        </div>
      </div>
    </div>
  );
}

// ── Card wrapper ───────────────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">{title}</h2>
      {children}
    </div>
  );
}

// ── Action bar (shared) ────────────────────────────────────────────────────────

function ActionBar({
  savingState,
  regenLoading,
  busy,
  onEdit,
  onSave,
  onRegen,
}: {
  savingState: AnyCard['savingState'];
  regenLoading: boolean;
  busy: boolean;
  onEdit: () => void;
  onSave: () => void;
  onRegen: () => void;
}) {
  return (
    <div className="flex items-center gap-2 px-5 pb-4 border-t border-slate-100 pt-3">
      <button
        type="button"
        onClick={onEdit}
        disabled={busy}
        className={clsx(
          'flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-medium transition-colors',
          busy ? 'border-slate-200 text-slate-400 cursor-not-allowed' : 'border-indigo-300 text-indigo-700 hover:bg-indigo-50'
        )}
      >
        {savingState === 'saving' ? <Loader2 size={14} className="animate-spin" /> : <Edit2 size={14} />}
        Tahrirlash
      </button>

      <button
        type="button"
        onClick={onSave}
        disabled={busy || savingState === 'saved'}
        className={clsx(
          'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors',
          savingState === 'saved'
            ? 'bg-green-100 text-green-700 cursor-default'
            : busy
            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
            : 'bg-indigo-600 text-white hover:bg-indigo-700'
        )}
      >
        {savingState === 'saving' ? (
          <Loader2 size={14} className="animate-spin" />
        ) : savingState === 'saved' ? (
          <Check size={14} />
        ) : (
          <Save size={14} />
        )}
        {savingState === 'saved' ? 'Saqlandi' : 'Saqlash'}
      </button>

      <button
        type="button"
        onClick={onRegen}
        disabled={busy}
        className={clsx(
          'flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ml-auto',
          busy ? 'border-slate-200 text-slate-400 cursor-not-allowed' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
        )}
      >
        {regenLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
        Qayta yaratish
      </button>
    </div>
  );
}

// ── Article result card ────────────────────────────────────────────────────────

function ArticleResultCard({
  card,
  onSave,
  onEdit,
  onRegen,
  globalGenerating,
}: {
  card: ArticleCard;
  onSave: () => void;
  onEdit: () => void;
  onRegen: () => void;
  globalGenerating: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showImages, setShowImages] = useState(false);
  const { data, savingState, saveError, regenLoading } = card;
  const busy = savingState === 'saving' || regenLoading || globalGenerating;
  const isUzbekistan = data.news_type === 'uzbekistan';
  const categoryLabel = CATEGORY_LABELS[data.category_hint] ?? data.category_hint;
  const imageSuggestions = [data.image_suggestion_1, data.image_suggestion_2, data.image_suggestion_3].filter(Boolean);

  return (
    <div className={clsx('bg-white rounded-2xl border shadow-sm overflow-hidden transition-all', savingState === 'saved' ? 'border-green-300' : 'border-slate-200')}>
      <div className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={clsx('inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full', isUzbekistan ? 'bg-blue-100 text-blue-700' : 'bg-violet-100 text-violet-700')}>
              {isUzbekistan ? <MapPin size={11} /> : <Globe size={11} />}
              {isUzbekistan ? "O'zbekiston" : 'Jahon'}
            </span>
            <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
              {categoryLabel}
            </span>
          </div>
          {savingState === 'saved' && (
            <span className="flex items-center gap-1 text-green-600 text-xs font-semibold bg-green-50 px-2.5 py-1 rounded-full shrink-0">
              <Check size={12} />Saqlandi
            </span>
          )}
        </div>

        <h3 className="font-bold text-slate-900 text-base leading-snug">{data.title_uz}</h3>
        <p className="text-sm text-slate-500 leading-relaxed">{data.summary_uz}</p>

        {(data.paragraphs_uz?.length ?? 0) > 0 && (
          <button type="button" onClick={() => setExpanded((v) => !v)} className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium">
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {expanded ? 'Maqolani yopish' : "To'liq maqolani ko'rish"}
          </button>
        )}

        {expanded && (
          <div className="space-y-2.5 text-sm text-slate-700 leading-relaxed border-t border-slate-100 pt-3">
            {data.paragraphs_uz?.map((p, i) => <p key={i}>{p}</p>)}
          </div>
        )}

        {imageSuggestions.length > 0 && (
          <div className="border-t border-slate-100 pt-3">
            <button type="button" onClick={() => setShowImages((v) => !v)} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 font-medium">
              <ImageIcon size={13} />
              {showImages ? 'Rasm tavsiyalarini yopish' : "3 ta rasm tavsiyasi ko'rish"}
              {showImages ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {showImages && (
              <div className="mt-2 space-y-1.5">
                {imageSuggestions.map((s, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                    <span className="shrink-0 font-bold text-slate-400 mt-0.5">{i + 1}.</span>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {savingState === 'error' && saveError && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
            <AlertCircle size={14} />{saveError}
          </div>
        )}
      </div>

      <ActionBar savingState={savingState} regenLoading={regenLoading} busy={busy} onEdit={onEdit} onSave={onSave} onRegen={onRegen} />
    </div>
  );
}

// ── News result card ───────────────────────────────────────────────────────────

function NewsResultCard({
  card,
  onSave,
  onEdit,
  onRegen,
  globalGenerating,
}: {
  card: NewsCard;
  onSave: () => void;
  onEdit: () => void;
  onRegen: () => void;
  globalGenerating: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showImages, setShowImages] = useState(false);
  const [showSources, setShowSources] = useState(true);
  const { data, savingState, saveError, regenLoading } = card;
  const busy = savingState === 'saving' || regenLoading || globalGenerating;
  const isUzbekistan = data.news_type === 'uzbekistan';
  const categoryLabel = CATEGORY_LABELS[data.category_hint] ?? data.category_hint;
  const imageSuggestions = [data.image_suggestion_1, data.image_suggestion_2, data.image_suggestion_3].filter(Boolean);
  const sources: NewsSource[] = Array.isArray(data.sources) ? data.sources : [];

  return (
    <div className={clsx('bg-white rounded-2xl border shadow-sm overflow-hidden transition-all', savingState === 'saved' ? 'border-green-300' : 'border-rose-100')}>
      {/* Rose top accent bar */}
      <div className="h-1 bg-gradient-to-r from-rose-500 to-orange-400" />

      <div className="p-5 space-y-3">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* News badge */}
            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-700">
              <Newspaper size={10} />
              Xabar
            </span>
            <span className={clsx('inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full', isUzbekistan ? 'bg-blue-100 text-blue-700' : 'bg-violet-100 text-violet-700')}>
              {isUzbekistan ? <MapPin size={11} /> : <Globe size={11} />}
              {isUzbekistan ? "O'zbekiston" : 'Jahon'}
            </span>
            <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
              {categoryLabel}
            </span>
            {data.event_date && (
              <span className="text-xs text-slate-400 font-medium">{data.event_date}</span>
            )}
          </div>
          {savingState === 'saved' && (
            <span className="flex items-center gap-1 text-green-600 text-xs font-semibold bg-green-50 px-2.5 py-1 rounded-full shrink-0">
              <Check size={12} />Saqlandi
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-bold text-slate-900 text-base leading-snug">{data.title_uz}</h3>

        {/* Summary */}
        <p className="text-sm text-slate-500 leading-relaxed">{data.summary_uz}</p>

        {/* Content toggle */}
        {(data.paragraphs_uz?.length ?? 0) > 0 && (
          <button type="button" onClick={() => setExpanded((v) => !v)} className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-800 font-medium">
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {expanded ? "Xabarni yopish" : "To'liq xabarni ko'rish"}
          </button>
        )}

        {expanded && (
          <div className="space-y-2.5 text-sm text-slate-700 leading-relaxed border-t border-slate-100 pt-3">
            {data.paragraphs_uz?.map((p, i) => <p key={i}>{p}</p>)}
          </div>
        )}

        {/* Sources section */}
        {sources.length > 0 && (
          <div className="border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setShowSources((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 mb-2"
            >
              <ExternalLink size={13} />
              Foydalanilgan manbalar ({sources.length} ta)
              {showSources ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {showSources && (
              <div className="space-y-1.5">
                {sources.map((src, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                    <span className="font-semibold text-rose-700 shrink-0 min-w-[80px]">{src.name}</span>
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800 hover:underline truncate flex items-center gap-1"
                      title={src.url}
                    >
                      {src.url}
                      <ExternalLink size={10} className="shrink-0" />
                    </a>
                  </div>
                ))}
                <p className="text-xs text-slate-400 italic pt-1">
                  * Manbalarni chop etishdan avval tekshirib chiqing
                </p>
              </div>
            )}
          </div>
        )}

        {/* Image suggestions */}
        {imageSuggestions.length > 0 && (
          <div className="border-t border-slate-100 pt-3">
            <button type="button" onClick={() => setShowImages((v) => !v)} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 font-medium">
              <ImageIcon size={13} />
              {showImages ? 'Rasm tavsiyalarini yopish' : "3 ta rasm tavsiyasi"}
              {showImages ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {showImages && (
              <div className="mt-2 space-y-1.5">
                {imageSuggestions.map((s, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                    <span className="shrink-0 font-bold text-slate-400 mt-0.5">{i + 1}.</span>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {savingState === 'error' && saveError && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
            <AlertCircle size={14} />{saveError}
          </div>
        )}
      </div>

      <ActionBar savingState={savingState} regenLoading={regenLoading} busy={busy} onEdit={onEdit} onSave={onSave} onRegen={onRegen} />
    </div>
  );
}
