'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { ArticleFormData, ContentBlock, EMPTY_ARTICLE_FORM, LangKey } from '@/types/blocks';
import { ArticleEditorForm } from '@/components/editor/article-editor-form';

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[''ʼ`]/g, '')       // remove apostrophes
    .replace(/[^a-z0-9\s-]/g, '') // strip non-ascii non-hyphen
    .trim()
    .replace(/\s+/g, '-')         // spaces → hyphens
    .replace(/-{2,}/g, '-');      // collapse consecutive hyphens
}

/** Ensures slug uniqueness by checking the DB and appending a suffix if taken */
async function ensureUniqueSlug(base: string): Promise<string> {
  const { data } = await supabase
    .from('articles')
    .select('slug')
    .eq('slug', base)
    .maybeSingle();

  if (!data) return base;

  // Append timestamp-based suffix
  const suffix = Date.now().toString(36);
  return `${base}-${suffix}`;
}

export default function NewArticlePage() {
  const router = useRouter();
  const [form, setForm] = useState<ArticleFormData>(EMPTY_ARTICLE_FORM);
  const [activeLang, setActiveLang] = useState<LangKey>('uz');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = <K extends keyof ArticleFormData>(
    key: K,
    value: ArticleFormData[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (publish: boolean) => {
    if (!form.title_uz.trim()) {
      setError("O'zbek tilidagi sarlavha majburiy");
      return;
    }

    setSaving(true);
    setError(null);

    // Strip runtime-only _localUrl before persisting
    const cleanBlocks: ContentBlock[] = form.content_blocks.map(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ({ _localUrl, ...block }) => block
    );

    // Generate unique slug from Uzbek title
    const baseSlug = generateSlug(form.title_uz) || `article-${Date.now().toString(36)}`;
    const slug = isSupabaseConfigured()
      ? await ensureUniqueSlug(baseSlug)
      : baseSlug;

    // Article row — no content_blocks column; blocks go into article_blocks table
    const articlePayload = {
      slug,
      title_uz:       form.title_uz,
      title_uz_cy:    form.title_uz_cy,
      title_ru:       form.title_ru,
      title_en:       form.title_en,
      summary_uz:     form.summary_uz,
      summary_uz_cy:  form.summary_uz_cy,
      summary_ru:     form.summary_ru,
      summary_en:     form.summary_en,
      category_id:    form.category_id || null,
      is_premium:     form.is_premium,
      is_published:   publish,
      featured_image_url: form.featured_image_url ?? null,
      audio_url:      form.audio_url ?? null,
      // Legacy plain-text fallback from first paragraph block
      content_uz:     cleanBlocks.find((b) => b.type === 'paragraph')?.text_uz ?? '',
      content_uz_cy:  cleanBlocks.find((b) => b.type === 'paragraph')?.text_uz_cy ?? '',
      content_ru:     cleanBlocks.find((b) => b.type === 'paragraph')?.text_ru ?? '',
      content_en:     cleanBlocks.find((b) => b.type === 'paragraph')?.text_en ?? '',
      // Author profile (inline columns — only included when populated so saves
      // succeed even if the DB has not yet had the migration applied)
      ...(form.author_name        ? { author_name:      form.author_name }        : { author_name: null }),
      ...(form.author_image_url   ? { author_image_url: form.author_image_url }   : { author_image_url: null }),
      ...(form.author_bio_uz      ? { author_bio_uz:    form.author_bio_uz }      : { author_bio_uz: null }),
      ...(form.author_bio_uz_cy   ? { author_bio_uz_cy: form.author_bio_uz_cy }   : { author_bio_uz_cy: null }),
      ...(form.author_bio_ru      ? { author_bio_ru:    form.author_bio_ru }      : { author_bio_ru: null }),
      ...(form.author_bio_en      ? { author_bio_en:    form.author_bio_en }      : { author_bio_en: null }),
      // Tags / keywords / issue
      tags:               form.tags ?? [],
      keywords:           form.keywords ?? [],
      issue_id:           form.issue_id ?? null,
      // price — only sent when set to avoid erroring on unmigrated databases
      ...(form.price != null ? { price: form.price } : {}),
    };

    try {
      if (isSupabaseConfigured()) {
        const { data, error: dbError } = await supabase
          .from('articles')
          .insert([articlePayload])
          .select('id')
          .single();

        if (dbError) throw new Error(dbError.message);

        // Save blocks into article_blocks table
        if (cleanBlocks.length > 0 && data?.id) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const blockRows = cleanBlocks.map(({ id: _id, ...block }, idx) => ({
            article_id: data.id,
            sort_order: idx,
            type:       block.type,      // canonical column name
            content:    block,           // all editor fields stored as JSONB
          }));

          const { error: blocksError } = await supabase
            .from('article_blocks')
            .insert(blockRows);

          if (blocksError) throw new Error(blocksError.message);
        }
      }
      router.push('/articles');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xatolik yuz berdi');
      setSaving(false);
    }
  };

  return (
    <ArticleEditorForm
      form={form}
      onChange={handleChange}
      activeLang={activeLang}
      onLangChange={setActiveLang}
      onSave={handleSave}
      saving={saving}
      error={error}
      pageTitle="Yangi Maqola"
      pageSubtitle="Yangi maqola yaratish"
    />
  );
}

