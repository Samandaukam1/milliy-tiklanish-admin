'use client';

import Link from 'next/link';
import { ArrowLeft, Save, Eye, Languages, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { ArticleFormData, ContentBlock, LangKey, LANG_TABS } from '@/types/blocks';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Header } from '@/components/header';
import { LangTabs } from './lang-tabs';
import { BlockEditor } from './block-editor';
import { FeaturedImageUpload } from './featured-image-upload';
import { ArticleAudioUpload } from './article-audio-upload';
import { AuthorSection } from './author-section';

interface CategoryOption {
  id: string;
  name_uz: string;
}

interface IssueOption {
  id: string;
  title: string;
}

interface ArticleEditorFormProps {
  form: ArticleFormData;
  onChange: <K extends keyof ArticleFormData>(key: K, value: ArticleFormData[K]) => void;
  activeLang: LangKey;
  onLangChange: (lang: LangKey) => void;
  articleId?: string;
  onSave: (publish: boolean) => Promise<void>;
  saving: boolean;
  error: string | null;
  pageTitle: string;
  pageSubtitle?: string;
  backHref?: string;
}

const FALLBACK_CATEGORIES: CategoryOption[] = [
  { id: '1', name_uz: 'Siyosat' },
  { id: '2', name_uz: 'Iqtisodiyot' },
  { id: '3', name_uz: 'Sport' },
  { id: '4', name_uz: 'Texnologiya' },
  { id: '5', name_uz: 'Madaniyat' },
  { id: '6', name_uz: 'Jamiyat' },
];

/** Reusable tag/keyword input chip widget */
function TagInput({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState('');

  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
    setInput('');
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {values.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(values.filter((t) => t !== tag))}
              className="hover:text-red-600 transition-colors"
            >
              <X size={10} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={add}
          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}

type TranslateStatus = 'idle' | 'loading' | 'success' | 'error';
type MultiLangValues = Partial<Record<LangKey, string>>;
type BlockTextPrefix = 'text' | 'quote' | 'title' | 'caption';

const TRANSLATE_SUCCESS_MESSAGE = 'Yetishmayotgan tillar to‘ldirildi';
const TRANSLATE_LANGS: LangKey[] = ['uz', 'uz_cy', 'ru', 'en'];

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasAnyLangValue(values: MultiLangValues): boolean {
  return TRANSLATE_LANGS.some((lang) => hasText(values[lang]));
}

function compactLangValues(values: MultiLangValues): MultiLangValues | undefined {
  const compacted: MultiLangValues = {};

  for (const lang of TRANSLATE_LANGS) {
    const value = values[lang];
    if (hasText(value)) {
      compacted[lang] = value;
    }
  }

  return Object.keys(compacted).length > 0 ? compacted : undefined;
}

function getBlockLangValues(block: ContentBlock, prefix: BlockTextPrefix): MultiLangValues {
  const values: MultiLangValues = {};

  for (const lang of TRANSLATE_LANGS) {
    const key = `${prefix}_${lang}` as keyof ContentBlock;
    values[lang] = block[key] as string | undefined;
  }

  return values;
}

function getHeadingTitleValues(block: ContentBlock): MultiLangValues {
  const values: MultiLangValues = {};

  for (const lang of TRANSLATE_LANGS) {
    const titleKey = `title_${lang}` as keyof ContentBlock;
    const textKey = `text_${lang}` as keyof ContentBlock;
    values[lang] = (block[titleKey] as string | undefined) || (block[textKey] as string | undefined);
  }

  return values;
}

export function ArticleEditorForm({
  form,
  onChange,
  activeLang,
  onLangChange,
  onSave,
  saving,
  error,
  pageTitle,
  pageSubtitle,
  backHref = '/articles',
}: ArticleEditorFormProps) {
  const [categories, setCategories] = useState<CategoryOption[]>(FALLBACK_CATEGORIES);
  const [issues, setIssues] = useState<IssueOption[]>([]);
  const [translateStatus, setTranslateStatus] = useState<TranslateStatus>('idle');
  const [translateError, setTranslateError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    supabase
      .from('categories')
      .select('id, name_uz')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name_uz', { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) setCategories(data);
      });
    supabase
      .from('issues')
      .select('id, title')
      .order('publish_date', { ascending: false })
      .then(({ data }) => {
        if (data) setIssues(data);
      });
  }, []);

  const handleTranslate = useCallback(async () => {
    // Check if any language has meaningful content
    const titleValues = {
      uz: form.title_uz,
      uz_cy: form.title_uz_cy,
      ru: form.title_ru,
      en: form.title_en,
    };
    const summaryValues = {
      uz: form.summary_uz,
      uz_cy: form.summary_uz_cy,
      ru: form.summary_ru,
      en: form.summary_en,
    };

    const bioValues = {
      uz: form.author_bio_uz,
      uz_cy: form.author_bio_uz_cy,
      ru: form.author_bio_ru,
      en: form.author_bio_en,
    };

    const hasAnyArticleContent = [titleValues, summaryValues, bioValues].some(hasAnyLangValue);

    const translatableTypes = new Set(['paragraph', 'heading', 'quote', 'image', 'audio', 'video']);
    const blockPayload = form.content_blocks
      .filter((b) => translatableTypes.has(b.type))
      .map((b) => {
        const payload: {
          id: string;
          type: string;
          text?: MultiLangValues;
          quote?: MultiLangValues;
          title?: MultiLangValues;
          caption?: MultiLangValues;
        } = {
          id: b.id,
          type: b.type,
        };

        const text = b.type === 'heading' ? undefined : compactLangValues(getBlockLangValues(b, 'text'));
        const title = compactLangValues(
          b.type === 'heading' ? getHeadingTitleValues(b) : getBlockLangValues(b, 'title')
        );
        const quote = compactLangValues(getBlockLangValues(b, 'quote'));
        const caption = compactLangValues(getBlockLangValues(b, 'caption'));

        if (text) payload.text = text;
        if (title) payload.title = title;
        if (quote) payload.quote = quote;
        if (caption) payload.caption = caption;

        return payload;
      })
      .filter((b) => b.text || b.quote || b.title || b.caption);

    const hasAnyBlockContent = blockPayload.length > 0;

    if (!hasAnyArticleContent && !hasAnyBlockContent) {
      setTranslateStatus('error');
      setTranslateError(
        "Tarjima qilinadigan matn topilmadi. Kamida bitta tilda sarlavha yoki tavsif kiriting."
      );
      return;
    }

    setTranslateStatus('loading');
    setTranslateError(null);

    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: compactLangValues(titleValues),
          summary: compactLangValues(summaryValues),
          bio: hasAnyLangValue(bioValues) ? compactLangValues(bioValues) : undefined,
          blocks: hasAnyBlockContent ? blockPayload : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setTranslateStatus('error');
        setTranslateError(data.error || 'Tarjima muvaffaqiyatsiz yakunlandi.');
        return;
      }

      // Apply article-level translations — only fill EMPTY fields
      const articleFieldMap: { resultKey: string; formKey: keyof ArticleFormData }[] = [
        { resultKey: 'title_uz', formKey: 'title_uz' },
        { resultKey: 'title_uz_cy', formKey: 'title_uz_cy' },
        { resultKey: 'title_ru', formKey: 'title_ru' },
        { resultKey: 'title_en', formKey: 'title_en' },
        { resultKey: 'summary_uz', formKey: 'summary_uz' },
        { resultKey: 'summary_uz_cy', formKey: 'summary_uz_cy' },
        { resultKey: 'summary_ru', formKey: 'summary_ru' },
        { resultKey: 'summary_en', formKey: 'summary_en' },
        { resultKey: 'bio_uz', formKey: 'author_bio_uz' },
        { resultKey: 'bio_uz_cy', formKey: 'author_bio_uz_cy' },
        { resultKey: 'bio_ru', formKey: 'author_bio_ru' },
        { resultKey: 'bio_en', formKey: 'author_bio_en' },
      ];

      for (const { resultKey, formKey } of articleFieldMap) {
        const translated = data[resultKey] as string | undefined;
        const current = form[formKey];
        if (hasText(translated) && !hasText(current)) {
          onChange(formKey, translated);
        }
      }

      // Apply block translations — only fill EMPTY fields per block
      if (data.blocks && Array.isArray(data.blocks)) {
        const translatedMap = new Map<string, Record<string, string>>();
        for (const bt of data.blocks) {
          translatedMap.set(bt.id, bt);
        }

        const updatedBlocks = form.content_blocks.map((block) => {
          const bt = translatedMap.get(block.id);
          if (!bt) return block;
          const next: ContentBlock = { ...block };
          const fill = (key: keyof ContentBlock, value: unknown) => {
            if (hasText(value) && !hasText(next[key])) {
              next[key] = value as never;
            }
          };

          for (const lang of TRANSLATE_LANGS) {
            const textKey = `text_${lang}` as keyof ContentBlock;
            const titleKey = `title_${lang}` as keyof ContentBlock;
            const quoteKey = `quote_${lang}` as keyof ContentBlock;
            const captionKey = `caption_${lang}` as keyof ContentBlock;
            const translatedTitle = bt[titleKey as string] || (block.type === 'heading' ? bt[textKey as string] : undefined);

            fill(textKey, bt[textKey as string]);
            fill(titleKey, translatedTitle);
            fill(quoteKey, bt[quoteKey as string]);
            fill(captionKey, bt[captionKey as string]);

            if (block.type === 'heading') {
              fill(textKey, translatedTitle);
            }
          }

          return next;
        });
        onChange('content_blocks', updatedBlocks);
      }

      setTranslateStatus('success');
      setTimeout(() => setTranslateStatus('idle'), 4000);
    } catch {
      setTranslateStatus('error');
      setTranslateError("Tarjima serveriga ulanib bo'lmadi.");
    }
  }, [form, onChange]);
  return (
    <div className="flex flex-col min-h-full">
      <Header title={pageTitle} subtitle={pageSubtitle} />

      <div className="flex-1 p-8">
        {/* Top action bar */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href={backHref}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors font-medium text-sm"
          >
            <ArrowLeft size={18} />
            Orqaga
          </Link>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onSave(false)}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? 'Saqlanmoqda...' : 'Qoralama saqla'}
            </button>
            <button
              type="button"
              onClick={() => onSave(true)}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm disabled:opacity-50"
            >
              <Eye size={16} />
              Nashr etish
            </button>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Demo mode warning */}
        {!isSupabaseConfigured() && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Demo rejim:</strong> Supabase sozlanmagan. Ma&apos;lumotlar saqlanmaydi,
              media fayllar faqat mahalliy ko&apos;rinishda ko&apos;rsatiladi.
            </p>
          </div>
        )}

        {/* Main layout: 2/3 + 1/3 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left column ── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Featured image */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Asosiy Rasm</h3>
              <FeaturedImageUpload
                url={form.featured_image_url}
                onChange={(url) => onChange('featured_image_url', url)}
              />
            </div>

            {/* Article audio */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-900">Audio Versiya</h3>
                <span className="text-xs text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full font-medium">
                  Tahririyat radiosi
                </span>
              </div>
              <ArticleAudioUpload
                url={form.audio_url}
                onChange={(url) => onChange('audio_url', url)}
              />
            </div>

            {/* Author profile */}
            <AuthorSection form={form} onChange={onChange} />

            {/* Multilingual title + summary */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="px-6 pt-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-900">Sarlavha va Tavsif</h3>

                  {/* Translate button */}
                  <button
                    type="button"
                    onClick={handleTranslate}
                    disabled={translateStatus === 'loading'}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      translateStatus === 'success'
                        ? 'bg-green-600 text-white'
                        : translateStatus === 'error'
                        ? 'bg-red-100 text-red-700 border border-red-300'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    } disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    {translateStatus === 'loading' ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Tarjima qilinmoqda...
                      </>
                    ) : translateStatus === 'success' ? (
                      <>
                        <CheckCircle2 size={14} />
                        {TRANSLATE_SUCCESS_MESSAGE}
                      </>
                    ) : translateStatus === 'error' ? (
                      <>
                        <AlertCircle size={14} />
                        Xatolik — qayta urining
                      </>
                    ) : (
                      <>
                        <Languages size={14} />
                        Tarjima qilish
                      </>
                    )}
                  </button>
                </div>

                {/* Translation error message */}
                {translateStatus === 'error' && translateError && (
                  <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs text-red-700">{translateError}</p>
                  </div>
                )}

                {/* Translation success hint */}
                {translateStatus === 'success' && (
                  <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-xs text-green-700">{TRANSLATE_SUCCESS_MESSAGE}</p>
                  </div>
                )}
              </div>
              <div className="px-6">
                <LangTabs active={activeLang} onChange={onLangChange} />
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Sarlavha
                    {activeLang === 'uz' && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <input
                    type="text"
                    value={(form[`title_${activeLang}` as keyof ArticleFormData] as string) || ''}
                    onChange={(e) =>
                      onChange(`title_${activeLang}` as keyof ArticleFormData, e.target.value)
                    }
                    placeholder="Maqola sarlavhasini kiriting..."
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Qisqa tavsif (Summary)
                  </label>
                  <textarea
                    rows={3}
                    value={
                      (form[`summary_${activeLang}` as keyof ArticleFormData] as string) || ''
                    }
                    onChange={(e) =>
                      onChange(`summary_${activeLang}` as keyof ArticleFormData, e.target.value)
                    }
                    placeholder="Maqolaning qisqa tavsifi..."
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Block editor */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-semibold text-slate-900">Maqola Kontenti</h3>
                <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                  {form.content_blocks.length} blok
                </span>
              </div>
              <BlockEditor
                blocks={form.content_blocks}
                activeLang={activeLang}
                onChange={(blocks) => onChange('content_blocks', blocks)}
              />
            </div>
          </div>

          {/* ── Right column ── */}
          <div className="space-y-6">
            {/* Publish settings */}
            <div className="bg-white rounded-lg border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Nashr sozlamalari</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Nashr etilgan</p>
                    <p className="text-xs text-slate-500 mt-0.5">Ommaga ko&apos;rsatish</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_published}
                      onChange={(e) => onChange('is_published', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                  </label>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Premium</p>
                    <p className="text-xs text-slate-500 mt-0.5">Faqat obunachilarga</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_premium}
                      onChange={(e) => onChange('is_premium', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-yellow-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                  </label>
                </div>
              </div>
            </div>

            {/* Category */}
            <div className="bg-white rounded-lg border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Kategoriya</h3>
              <select
                value={form.category_id}
                onChange={(e) => onChange('category_id', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Kategoriya tanlang...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name_uz}
                  </option>
                ))}
              </select>
            </div>

            {/* Issue (Gazeta soni) */}
            <div className="bg-white rounded-lg border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Gazeta soni</h3>
              <select
                value={form.issue_id ?? ''}
                onChange={(e) => onChange('issue_id', e.target.value || undefined)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sonsiz (alohida maqola)</option>
                {issues.map((iss) => (
                  <option key={iss.id} value={iss.id}>
                    {iss.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Premium price */}
            {form.is_premium && (
              <div className="bg-white rounded-lg border border-slate-200 p-5">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Narx (ixtiyoriy)</h3>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.price ?? ''}
                    onChange={(e) =>
                      onChange('price', e.target.value ? parseFloat(e.target.value) : undefined)
                    }
                    placeholder="0.00"
                    className="w-full pl-8 pr-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₸</span>
                </div>
              </div>
            )}

            {/* Tags */}
            <div className="bg-white rounded-lg border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Teglar (Tags)</h3>
              <TagInput
                values={form.tags ?? []}
                onChange={(v) => onChange('tags', v)}
                placeholder="Teg qo'shish..."
              />
            </div>

            {/* Keywords */}
            <div className="bg-white rounded-lg border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Kalit so&apos;zlar</h3>
              <TagInput
                values={form.keywords ?? []}
                onChange={(v) => onChange('keywords', v)}
                placeholder="Kalit so'z qo'shish..."
              />
            </div>

            {/* Fill status */}
            <div className="bg-white rounded-lg border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">To&apos;ldirish holati</h3>
              <div className="space-y-2">
                {LANG_TABS.map(({ key, label }) => {
                  const titleKey = `title_${key}` as keyof ArticleFormData;
                  const summaryKey = `summary_${key}` as keyof ArticleFormData;
                  const hasTitle = !!(form[titleKey] as string);
                  const hasSummary = !!(form[summaryKey] as string);
                  const filled = hasTitle && hasSummary;
                  const partial = hasTitle || hasSummary;

                  return (
                    <div key={key} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">{label}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          filled
                            ? 'bg-green-100 text-green-700'
                            : partial
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {filled ? 'Tayyor' : partial ? 'Qisman' : "Bo'sh"}
                      </span>
                    </div>
                  );
                })}

                <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-100">
                  <span className="text-slate-600">Asosiy rasm</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${form.featured_image_url ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {form.featured_image_url ? 'Yuklangan' : "Yo'q"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Audio versiya</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${form.audio_url ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'}`}>
                    {form.audio_url ? 'Yuklangan' : "Yo'q"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Bloklar</span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      form.content_blocks.length > 0
                        ? 'bg-green-100 text-green-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {form.content_blocks.length} ta
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
