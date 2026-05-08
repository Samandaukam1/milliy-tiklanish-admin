'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { ArticleFormData, ContentBlock, EMPTY_ARTICLE_FORM, LangKey } from '@/types/blocks';
import { ArticleEditorForm } from '@/components/editor/article-editor-form';
import { Header } from '@/components/header';

/** Convert an article_blocks row back into the ContentBlock shape used by the editor */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToBlock(row: any): ContentBlock {
  // Support both the JSONB-envelope schema (row.content) and the
  // legacy flat-column schema (row.text_uz etc.) so old rows still load.
  const fields = row.content && typeof row.content === 'object' ? row.content : row;
  // Support both 'type' (current) and 'block_type' (legacy DB column name)
  const blockType = row.type ?? row.block_type ?? fields.type ?? fields.block_type ?? 'paragraph';
  return {
    id:            row.id,
    type:          blockType,
    text_uz:       fields.text_uz      ?? fields.title_uz ?? undefined,
    text_uz_cy:    fields.text_uz_cy   ?? fields.title_uz_cy ?? undefined,
    text_ru:       fields.text_ru      ?? fields.title_ru ?? undefined,
    text_en:       fields.text_en      ?? fields.title_en ?? undefined,
    title_uz:      fields.title_uz     ?? (blockType === 'heading' ? fields.text_uz : undefined),
    title_uz_cy:   fields.title_uz_cy  ?? (blockType === 'heading' ? fields.text_uz_cy : undefined),
    title_ru:      fields.title_ru     ?? (blockType === 'heading' ? fields.text_ru : undefined),
    title_en:      fields.title_en     ?? (blockType === 'heading' ? fields.text_en : undefined),
    level:         fields.level        ?? undefined,
    quote_uz:      fields.quote_uz     ?? undefined,
    quote_uz_cy:   fields.quote_uz_cy  ?? undefined,
    quote_ru:      fields.quote_ru     ?? undefined,
    quote_en:      fields.quote_en     ?? undefined,
    attribution:   fields.attribution  ?? undefined,
    media_url:     fields.media_url    ?? undefined,
    caption_uz:    fields.caption_uz   ?? undefined,
    caption_uz_cy: fields.caption_uz_cy ?? undefined,
    caption_ru:    fields.caption_ru   ?? undefined,
    caption_en:    fields.caption_en   ?? undefined,
    video_url:     fields.video_url    ?? undefined,
  };
}

export default function EditArticlePage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [form, setForm] = useState<ArticleFormData | null>(null);
  const [activeLang, setActiveLang] = useState<LangKey>('uz');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      if (!isSupabaseConfigured()) {
        setForm({ ...EMPTY_ARTICLE_FORM, title_uz: 'Demo maqola (tahrirlash)' });
        setLoading(false);
        return;
      }

      // Fetch article + its blocks in parallel
      const [articleRes, blocksRes] = await Promise.all([
        supabase.from('articles').select('*').eq('id', id).single(),
        supabase
          .from('article_blocks')
          .select('*')
          .eq('article_id', id)
          .order('sort_order'),
      ]);

      if (articleRes.error || !articleRes.data) {
        setError('Maqola topilmadi');
        setLoading(false);
        return;
      }

      const data = articleRes.data;
      const blocks: ContentBlock[] = (blocksRes.data ?? []).map(rowToBlock);

      setForm({
        title_uz:       data.title_uz    ?? '',
        title_uz_cy:    data.title_uz_cy ?? '',
        title_ru:       data.title_ru    ?? '',
        title_en:       data.title_en    ?? '',
        summary_uz:     data.summary_uz    ?? '',
        summary_uz_cy:  data.summary_uz_cy ?? '',
        summary_ru:     data.summary_ru    ?? '',
        summary_en:     data.summary_en    ?? '',
        category_id:    data.category_id  ?? '',
        is_premium:     data.is_premium   ?? false,
        is_published:   data.is_published ?? false,
        featured_image_url: data.featured_image_url ?? undefined,
        audio_url:      data.audio_url    ?? undefined,
        content_blocks: blocks,
        // Author profile
        author_name:      data.author_name      ?? '',
        author_image_url: data.author_image_url ?? undefined,
        author_bio_uz:    data.author_bio_uz    ?? '',
        author_bio_uz_cy: data.author_bio_uz_cy ?? '',
        author_bio_ru:    data.author_bio_ru    ?? '',
        author_bio_en:    data.author_bio_en    ?? '',
        // Tags / keywords / issue / price
        tags:             data.tags             ?? [],
        keywords:         data.keywords         ?? [],
        issue_id:         data.issue_id         ?? undefined,
        price:            data.price            ?? undefined,
      });
      setLoading(false);
    };

    load();
  }, [id]);

  const handleChange = <K extends keyof ArticleFormData>(key: K, value: ArticleFormData[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSave = async (publish: boolean) => {
    if (!form) return;
    if (!form.title_uz.trim()) {
      setError("O'zbek tilidagi sarlavha majburiy");
      return;
    }

    setSaving(true);
    setError(null);

    const cleanBlocks: ContentBlock[] = form.content_blocks.map(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ({ _localUrl, ...block }) => block
    );

    const articlePayload = {
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
      content_uz:     cleanBlocks.find((b) => b.type === 'paragraph')?.text_uz ?? '',
      content_uz_cy:  cleanBlocks.find((b) => b.type === 'paragraph')?.text_uz_cy ?? '',
      content_ru:     cleanBlocks.find((b) => b.type === 'paragraph')?.text_ru ?? '',
      content_en:     cleanBlocks.find((b) => b.type === 'paragraph')?.text_en ?? '',
      updated_at:     new Date().toISOString(),
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
        const { error: dbError } = await supabase
          .from('articles')
          .update(articlePayload)
          .eq('id', id);

        if (dbError) throw new Error(dbError.message);

        // Replace all blocks: delete existing, insert new
        const { error: delError } = await supabase
          .from('article_blocks')
          .delete()
          .eq('article_id', id);

        if (delError) throw new Error(delError.message);

        if (cleanBlocks.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const blockRows = cleanBlocks.map(({ id: _id, ...block }, idx) => ({
            article_id: id,
            sort_order: idx,
            type:       block.type,
            content:    block, // all editor fields stored as JSONB
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

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Maqolani tahrirlash" />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full" />
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Maqolani tahrirlash" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-red-600">{error ?? 'Maqola topilmadi'}</p>
        </div>
      </div>
    );
  }

  return (
    <ArticleEditorForm
      form={form}
      onChange={handleChange}
      activeLang={activeLang}
      onLangChange={setActiveLang}
      articleId={id}
      onSave={handleSave}
      saving={saving}
      error={error}
      pageTitle="Maqolani Tahrirlash"
      pageSubtitle={`ID: ${id}`}
      backHref="/articles"
    />
  );
}
