import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// ── Types ──────────────────────────────────────────────────────────────────────

type LangCode = 'uz' | 'uz_cy' | 'ru' | 'en';
type BlockFieldPrefix = 'text' | 'quote' | 'title' | 'caption';

interface MultiLangField {
  uz?: string;
  uz_cy?: string;
  ru?: string;
  en?: string;
}

interface BlockMultiLangPayload {
  id: string;
  type: string;
  text?: MultiLangField;
  quote?: MultiLangField;
  title?: MultiLangField;
  caption?: MultiLangField;
}

interface TranslateRequestBody {
  articleId?: string;
  title?: MultiLangField;
  summary?: MultiLangField;
  bio?: MultiLangField;
  blocks?: BlockMultiLangPayload[];
}

interface ArticleRow {
  id: string;
  title_uz: string | null;
  title_uz_cy: string | null;
  title_ru: string | null;
  title_en: string | null;
  summary_uz: string | null;
  summary_uz_cy: string | null;
  summary_ru: string | null;
  summary_en: string | null;
  author_bio_uz: string | null;
  author_bio_uz_cy: string | null;
  author_bio_ru: string | null;
  author_bio_en: string | null;
}

interface ArticleBlockRow {
  id: string;
  article_id: string;
  sort_order: number;
  type: string;
  content: unknown;
}

interface SkippedBlockInfo {
  id: string;
  type: string;
}

// ── Language metadata ──────────────────────────────────────────────────────────

const LANG_ORDER: LangCode[] = ['uz', 'uz_cy', 'ru', 'en'];
const MAX_TRANSLATION_CHARS = 7800;

const LANG_LABELS: Record<LangCode, string> = {
  uz: 'Uzbek Latin',
  uz_cy: 'Uzbek Cyrillic',
  ru: 'Russian',
  en: 'English',
};

const SUCCESS_MESSAGE = 'Yetishmayotgan tillar to‘ldirildi';

// ── Helpers ────────────────────────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getSupabaseConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  return { url, key };
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function getLangFieldKey(prefix: string, lang: LangCode): string {
  return `${prefix}_${lang}`;
}

function safeParseBlockContent(value: unknown, blockId: string): Record<string, unknown> {
  if (isRecord(value)) {
    return { ...value };
  }

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (isRecord(parsed)) {
        return parsed;
      }
    } catch (error) {
      console.warn('[translate] Failed to parse article_blocks.content JSON:', {
        blockId,
        error,
      });
    }
  }

  return {};
}

function blockFieldFromContent(
  content: Record<string, unknown>,
  prefix: BlockFieldPrefix
): MultiLangField | undefined {
  const field: MultiLangField = {};

  for (const lang of LANG_ORDER) {
    const value = normalizeText(content[getLangFieldKey(prefix, lang)]);
    if (value) {
      field[lang] = value;
    }
  }

  return Object.keys(field).length > 0 ? field : undefined;
}

function buildArticleResponse(article: ArticleRow): Record<string, string> {
  return {
    title_uz: article.title_uz ?? '',
    title_uz_cy: article.title_uz_cy ?? '',
    title_ru: article.title_ru ?? '',
    title_en: article.title_en ?? '',
    summary_uz: article.summary_uz ?? '',
    summary_uz_cy: article.summary_uz_cy ?? '',
    summary_ru: article.summary_ru ?? '',
    summary_en: article.summary_en ?? '',
    bio_uz: article.author_bio_uz ?? '',
    bio_uz_cy: article.author_bio_uz_cy ?? '',
    bio_ru: article.author_bio_ru ?? '',
    bio_en: article.author_bio_en ?? '',
  };
}

function buildBlocksResponse(blocks: ArticleBlockRow[]): Array<Record<string, unknown>> {
  return blocks.map((block) => ({
    id: block.id,
    ...safeParseBlockContent(block.content, block.id),
  }));
}

/** Returns the first available source language and its text from a multilang field */
function detectSource(field: MultiLangField): { lang: LangCode; text: string } | null {
  for (const lang of LANG_ORDER) {
    const val = field[lang];
    if (val && val.trim()) return { lang, text: val.trim() };
  }
  return null;
}

/** Returns language codes that are currently empty in the field */
function getMissingTargets(field: MultiLangField, sourceLang: LangCode): LangCode[] {
  return LANG_ORDER.filter(
    (lang) => lang !== sourceLang && !(field[lang] && field[lang]!.trim())
  );
}

function langListLabel(langs: LangCode[]): string {
  return langs.map((l) => LANG_LABELS[l]).join(', ');
}

function hasAnyFieldContent(field: MultiLangField | undefined): boolean {
  if (!field) return false;
  return LANG_ORDER.some((lang) => Boolean(normalizeText(field[lang])));
}

function hasAnyRequestContent(
  fields: Array<MultiLangField | undefined>,
  blocks: BlockMultiLangPayload[]
): boolean {
  return (
    fields.some(hasAnyFieldContent) ||
    blocks.some((block) =>
      [block.text, block.quote, block.title, block.caption].some(hasAnyFieldContent)
    )
  );
}

// ── Translation specs ──────────────────────────────────────────────────────────

interface FieldTranslationSpec {
  fieldName: string;
  sourceLabel: string;
  sourceText: string;
  targets: LangCode[];
}

interface BlockTranslationSpec {
  id: string;
  type: string;
  fields: {
    prefix: BlockFieldPrefix;
    sourceLabel: string;
    sourceText: string;
    targets: LangCode[];
  }[];
}

function buildArticleSpecs(
  fields: Array<[string, MultiLangField | undefined]>
): FieldTranslationSpec[] {
  const specs: FieldTranslationSpec[] = [];

  for (const [fieldName, field] of fields) {
    if (!field) continue;
    const source = detectSource(field);
    if (!source) continue;

    const missing = getMissingTargets(field, source.lang);
    if (missing.length === 0) continue;

    specs.push({
      fieldName,
      sourceLabel: LANG_LABELS[source.lang],
      sourceText: source.text,
      targets: missing,
    });
  }

  return specs;
}

function buildBlockSpecs(
  blocks: BlockMultiLangPayload[]
): { blockSpecs: BlockTranslationSpec[]; skippedNonTextBlocks: SkippedBlockInfo[] } {
  const blockSpecs: BlockTranslationSpec[] = [];
  const skippedNonTextBlocks: SkippedBlockInfo[] = [];

  for (const block of blocks) {
    const fieldEntries: Array<[BlockFieldPrefix, MultiLangField | undefined]> = [
      ['text', block.text],
      ['quote', block.quote],
      ['title', block.title],
      ['caption', block.caption],
    ];

    const fieldSpecs: BlockTranslationSpec['fields'] = [];
    let hasAnySourceText = false;

    for (const [prefix, field] of fieldEntries) {
      if (!field) continue;
      const source = detectSource(field);
      if (!source) continue;

      hasAnySourceText = true;
      const missing = getMissingTargets(field, source.lang);
      if (missing.length === 0) continue;

      fieldSpecs.push({
        prefix,
        sourceLabel: LANG_LABELS[source.lang],
        sourceText: source.text,
        targets: missing,
      });
    }

    if (fieldSpecs.length > 0) {
      blockSpecs.push({ id: block.id, type: block.type, fields: fieldSpecs });
      continue;
    }

    if (!hasAnySourceText) {
      skippedNonTextBlocks.push({ id: block.id, type: block.type });
    }
  }

  return { blockSpecs, skippedNonTextBlocks };
}

interface TextChunk {
  text: string;
  joiner: string;
}

class TranslationError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = 'TranslationError';
    this.status = status;
  }
}

function translationErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof TranslationError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return null;
}

function splitTextIntoChunks(text: string): TextChunk[] {
  let remaining = text.trim();
  const chunks: TextChunk[] = [];

  while (remaining.length > MAX_TRANSLATION_CHARS) {
    const minUsefulSplit = Math.floor(MAX_TRANSLATION_CHARS * 0.4);
    const candidates = [
      { index: remaining.lastIndexOf('\n\n', MAX_TRANSLATION_CHARS), delimiter: 2, joiner: '\n\n' },
      { index: remaining.lastIndexOf('\n', MAX_TRANSLATION_CHARS), delimiter: 1, joiner: '\n' },
      { index: remaining.lastIndexOf('. ', MAX_TRANSLATION_CHARS), delimiter: 2, joiner: ' ' },
      { index: remaining.lastIndexOf('! ', MAX_TRANSLATION_CHARS), delimiter: 2, joiner: ' ' },
      { index: remaining.lastIndexOf('? ', MAX_TRANSLATION_CHARS), delimiter: 2, joiner: ' ' },
      { index: remaining.lastIndexOf(' ', MAX_TRANSLATION_CHARS), delimiter: 1, joiner: ' ' },
    ];
    const split = candidates.find((candidate) => candidate.index >= minUsefulSplit);

    if (split) {
      const includePunctuation = split.joiner === ' ' && split.delimiter === 2;
      const chunkEnd = split.index + (includePunctuation ? 1 : 0);
      const nextStart = split.index + split.delimiter;
      chunks.push({ text: remaining.slice(0, chunkEnd).trim(), joiner: split.joiner });
      remaining = remaining.slice(nextStart).trim();
    } else {
      chunks.push({
        text: remaining.slice(0, MAX_TRANSLATION_CHARS).trim(),
        joiner: '',
      });
      remaining = remaining.slice(MAX_TRANSLATION_CHARS).trim();
    }
  }

  if (remaining) {
    chunks.push({ text: remaining, joiner: '' });
  }

  return chunks;
}

function buildFieldChunkPrompt({
  fieldLabel,
  sourceLabel,
  sourceText,
  targets,
  chunkIndex,
  totalChunks,
}: {
  fieldLabel: string;
  sourceLabel: string;
  sourceText: string;
  targets: LangCode[];
  chunkIndex: number;
  totalChunks: number;
}): string {
  const expectedKeys = targets.map((target) => `"${target}": "..."`);
  const chunkNote =
    totalChunks > 1
      ? `This is chunk ${chunkIndex + 1} of ${totalChunks} from one longer field. Translate only this chunk; it will be merged with the other chunks in order.`
      : 'This is the complete field.';

  return `You are a professional multilingual journalist and translator.

Field: ${fieldLabel}
Source language: ${sourceLabel}
Target languages: ${langListLabel(targets)}
${chunkNote}

Source text:
"""${sourceText}"""

Translation quality rules:
- Uzbek Latin: natural Uzbek Latin
- Uzbek Cyrillic: natural Uzbek Cyrillic with correct orthography
- Russian: editorial and natural, not word-for-word
- English: clear and professional
- Preserve meaning, paragraph breaks, headings, quotes, numbers, names, and journalistic tone
- Keep media URLs and non-text values unchanged by not returning them
- Do not shorten, summarize, add commentary, or add explanations

Return ONLY a valid JSON object with exactly these keys:
{
  ${expectedKeys.join(',\n  ')}
}`;
}

function parseJsonObject(content: string, label: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(content);
    if (isRecord(parsed)) {
      return parsed;
    }
  } catch {
    console.error(`[translate] Failed to parse ${label} JSON:`, content);
  }

  throw new TranslationError("Tarjima natijasini tahlil qilib bo'lmadi.");
}

async function translateFieldTargets({
  apiKey,
  fieldLabel,
  sourceLabel,
  sourceText,
  targets,
}: {
  apiKey: string;
  fieldLabel: string;
  sourceLabel: string;
  sourceText: string;
  targets: LangCode[];
}): Promise<Partial<Record<LangCode, string>>> {
  const chunks = splitTextIntoChunks(sourceText);
  const translatedChunks: Record<LangCode, string[]> = {
    uz: [],
    uz_cy: [],
    ru: [],
    en: [],
  };

  for (const [chunkIndex, chunk] of chunks.entries()) {
    const prompt = buildFieldChunkPrompt({
      fieldLabel,
      sourceLabel,
      sourceText: chunk.text,
      targets,
      chunkIndex,
      totalChunks: chunks.length,
    });
    const content = await callOpenAI(apiKey, prompt, true);

    if (!content) {
      throw new TranslationError("Tarjima serveri xatolik qaytardi. Keyinroq urinib ko'ring.");
    }

    const parsed = parseJsonObject(content, fieldLabel);

    for (const target of targets) {
      const translated = normalizeText(parsed[target]);
      if (!translated) {
        throw new TranslationError("Tarjima natijasini tahlil qilib bo'lmadi.");
      }
      translatedChunks[target].push(translated);
    }
  }

  const merged: Partial<Record<LangCode, string>> = {};
  for (const target of targets) {
    merged[target] = translatedChunks[target]
      .map((chunk, index) => `${chunk}${chunks[index]?.joiner ?? ''}`)
      .join('')
      .trim();
  }

  return merged;
}

async function translateArticleSpecs(
  apiKey: string,
  specs: FieldTranslationSpec[]
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};

  for (const spec of specs) {
    const translated = await translateFieldTargets({
      apiKey,
      fieldLabel: spec.fieldName,
      sourceLabel: spec.sourceLabel,
      sourceText: spec.sourceText,
      targets: spec.targets,
    });

    for (const target of spec.targets) {
      const value = translated[target];
      if (value) {
        result[getLangFieldKey(spec.fieldName, target)] = value;
      }
    }
  }

  return result;
}

async function translateBlockSpecs(
  apiKey: string,
  specs: BlockTranslationSpec[]
): Promise<Array<Record<string, string>>> {
  const blocks: Array<Record<string, string>> = [];

  for (const spec of specs) {
    const translatedBlock: Record<string, string> = { id: spec.id };

    for (const field of spec.fields) {
      const translated = await translateFieldTargets({
        apiKey,
        fieldLabel: `${spec.type}.${field.prefix}`,
        sourceLabel: field.sourceLabel,
        sourceText: field.sourceText,
        targets: field.targets,
      });

      for (const target of field.targets) {
        const value = translated[target];
        if (value) {
          translatedBlock[getLangFieldKey(field.prefix, target)] = value;
        }
      }
    }

    blocks.push(translatedBlock);
  }

  return blocks;
}

// ── OpenAI call helper ─────────────────────────────────────────────────────────

async function callOpenAI(
  apiKey: string,
  prompt: string,
  jsonMode: boolean
): Promise<string | null> {
  const body: Record<string, unknown> = {
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
  };
  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('[translate] OpenAI error:', response.status, errText);
    return null;
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? null;
}

async function translateArticleById(articleId: string, apiKey: string) {
  const supabaseConfig = getSupabaseConfig();
  if (!supabaseConfig) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 500 });
  }

  const supabase = createClient(supabaseConfig.url, supabaseConfig.key);

  const [articleRes, blocksRes] = await Promise.all([
    supabase
      .from('articles')
      .select(
        'id, title_uz, title_uz_cy, title_ru, title_en, summary_uz, summary_uz_cy, summary_ru, summary_en, author_bio_uz, author_bio_uz_cy, author_bio_ru, author_bio_en'
      )
      .eq('id', articleId)
      .single<ArticleRow>(),
    supabase
      .from('article_blocks')
      .select('id, article_id, sort_order, type, content')
      .eq('article_id', articleId)
      .order('sort_order')
      .returns<ArticleBlockRow[]>(),
  ]);

  if (articleRes.error || !articleRes.data) {
    return NextResponse.json({ error: 'Maqola topilmadi' }, { status: 404 });
  }

  if (blocksRes.error) {
    console.error('[translate] Failed to load article blocks:', blocksRes.error);
    return NextResponse.json({ error: 'Maqola bloklarini yuklab bo\'lmadi' }, { status: 500 });
  }

  const article = articleRes.data;
  const blocks = blocksRes.data ?? [];
  const blockContentMap = new Map<string, Record<string, unknown>>();
  const blockPayload = blocks.map((block) => {
    const content = safeParseBlockContent(block.content, block.id);
    blockContentMap.set(block.id, content);

    return {
      id: block.id,
      type: block.type,
      text: blockFieldFromContent(content, 'text'),
      quote: blockFieldFromContent(content, 'quote'),
      title: blockFieldFromContent(content, 'title'),
      caption: blockFieldFromContent(content, 'caption'),
    } satisfies BlockMultiLangPayload;
  });

  const articleSpecs = buildArticleSpecs([
    [
      'title',
      {
        ...(article.title_uz ? { uz: article.title_uz } : {}),
        ...(article.title_uz_cy ? { uz_cy: article.title_uz_cy } : {}),
        ...(article.title_ru ? { ru: article.title_ru } : {}),
        ...(article.title_en ? { en: article.title_en } : {}),
      },
    ],
    [
      'summary',
      {
        ...(article.summary_uz ? { uz: article.summary_uz } : {}),
        ...(article.summary_uz_cy ? { uz_cy: article.summary_uz_cy } : {}),
        ...(article.summary_ru ? { ru: article.summary_ru } : {}),
        ...(article.summary_en ? { en: article.summary_en } : {}),
      },
    ],
    [
      'bio',
      {
        ...(article.author_bio_uz ? { uz: article.author_bio_uz } : {}),
        ...(article.author_bio_uz_cy ? { uz_cy: article.author_bio_uz_cy } : {}),
        ...(article.author_bio_ru ? { ru: article.author_bio_ru } : {}),
        ...(article.author_bio_en ? { en: article.author_bio_en } : {}),
      },
    ],
  ]);

  const { blockSpecs, skippedNonTextBlocks } = buildBlockSpecs(blockPayload);

  const translatedBlockIds: string[] = [];

  if (articleSpecs.length === 0 && blockSpecs.length === 0) {
    console.info('[translate] Article already translated or contains no missing block fields', {
      articleId,
      blocksCount: blocks.length,
      translatedBlockIds,
      skippedNonTextBlocks,
    });

    return NextResponse.json({
      persisted: true,
      message: SUCCESS_MESSAGE,
      ...buildArticleResponse(article),
      blocks: buildBlocksResponse(blocks),
      stats: {
        articleId,
        blocksCount: blocks.length,
        translatedBlockIds,
        skippedNonTextBlocks,
      },
    });
  }

  const articleUpdate: Partial<ArticleRow> = {};
  const updatedBlocks = blocks.map((block) => ({
    ...block,
    content: blockContentMap.get(block.id) ?? {},
  }));

  if (articleSpecs.length > 0) {
    let parsed: Record<string, string>;
    try {
      parsed = await translateArticleSpecs(apiKey, articleSpecs);
    } catch (error) {
      const response = translationErrorResponse(error);
      if (response) return response;
      throw error;
    }

    const articleFieldMap: Array<[string, keyof ArticleRow]> = [
      ['title_uz', 'title_uz'],
      ['title_uz_cy', 'title_uz_cy'],
      ['title_ru', 'title_ru'],
      ['title_en', 'title_en'],
      ['summary_uz', 'summary_uz'],
      ['summary_uz_cy', 'summary_uz_cy'],
      ['summary_ru', 'summary_ru'],
      ['summary_en', 'summary_en'],
      ['bio_uz', 'author_bio_uz'],
      ['bio_uz_cy', 'author_bio_uz_cy'],
      ['bio_ru', 'author_bio_ru'],
      ['bio_en', 'author_bio_en'],
    ];

    for (const [responseKey, articleKey] of articleFieldMap) {
      const translated = normalizeText(parsed[responseKey]);
      if (translated && !normalizeText(article[articleKey])) {
        articleUpdate[articleKey] = translated;
      }
    }
  }

  if (blockSpecs.length > 0) {
    let translatedBlocks: Array<Record<string, string>>;
    try {
      translatedBlocks = await translateBlockSpecs(apiKey, blockSpecs);
    } catch (error) {
      const response = translationErrorResponse(error);
      if (response) return response;
      throw error;
    }

    const translatedBlockEntries: Array<[string, Record<string, unknown>]> = [];
    for (const block of translatedBlocks) {
      const id = normalizeText(block.id);
      if (id) {
        translatedBlockEntries.push([id, block]);
      }
    }
    const translatedBlockMap = new Map<string, Record<string, unknown>>(translatedBlockEntries);

    for (const spec of blockSpecs) {
      const translatedBlock = translatedBlockMap.get(spec.id);
      if (!translatedBlock) continue;

      const blockIndex = updatedBlocks.findIndex((block) => block.id === spec.id);
      if (blockIndex === -1) continue;

      const currentContent = safeParseBlockContent(updatedBlocks[blockIndex].content, spec.id);
      let didTranslateBlock = false;

      for (const fieldSpec of spec.fields) {
        for (const target of fieldSpec.targets) {
          const fieldKey = getLangFieldKey(fieldSpec.prefix, target);
          const translated = normalizeText(translatedBlock[fieldKey]);

          if (translated && !normalizeText(currentContent[fieldKey])) {
            currentContent[fieldKey] = translated;
            didTranslateBlock = true;
          }
        }
      }

      if (!didTranslateBlock) continue;

      updatedBlocks[blockIndex] = {
        ...updatedBlocks[blockIndex],
        content: currentContent,
      };
      translatedBlockIds.push(spec.id);
    }
  }

  if (Object.keys(articleUpdate).length > 0) {
    const { error: articleUpdateError } = await supabase
      .from('articles')
      .update(articleUpdate)
      .eq('id', articleId);

    if (articleUpdateError) {
      console.error('[translate] Failed to update article:', articleUpdateError);
      return NextResponse.json({ error: 'Maqolani yangilab bo\'lmadi' }, { status: 500 });
    }
  }

  const blocksToPersist = updatedBlocks.filter((block) => translatedBlockIds.includes(block.id));
  if (blocksToPersist.length > 0) {
    const updateResults = await Promise.all(
      blocksToPersist.map((block) =>
        supabase.from('article_blocks').update({ content: block.content }).eq('id', block.id)
      )
    );

    const updateError = updateResults.find((result) => result.error)?.error;
    if (updateError) {
      console.error('[translate] Failed to update article block content:', updateError);
      return NextResponse.json({ error: 'Maqola bloklarini yangilab bo\'lmadi' }, { status: 500 });
    }
  }

  const updatedArticle: ArticleRow = {
    ...article,
    ...articleUpdate,
  };

  console.info('[translate] Persisted article translation', {
    articleId,
    blocksCount: blocks.length,
    translatedBlockIds,
    skippedNonTextBlocks,
  });

  return NextResponse.json({
    persisted: true,
    message: SUCCESS_MESSAGE,
    ...buildArticleResponse(updatedArticle),
    blocks: buildBlocksResponse(updatedBlocks),
    stats: {
      articleId,
      blocksCount: blocks.length,
      translatedBlockIds,
      skippedNonTextBlocks,
    },
  });
}

// ── Route handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[translate] OPENAI_API_KEY is not configured');
    return NextResponse.json({ error: 'Translation service is not configured' }, { status: 500 });
  }

  let body: TranslateRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { articleId, title, summary, bio } = body;
  const blocks = body.blocks ?? [];

  if (articleId && !hasAnyRequestContent([title, summary, bio], blocks)) {
    return translateArticleById(articleId, apiKey);
  }

  // ── Build article-level translation specs ────────────────────────────────────
  const articleSpecs = buildArticleSpecs([
    ['title', title],
    ['summary', summary],
    ['bio', bio],
  ] as [string, MultiLangField | undefined][]);

  // ── Build block translation specs ────────────────────────────────────────────
  const { blockSpecs } = buildBlockSpecs(blocks);
  const hasContent = hasAnyRequestContent([title, summary, bio], blocks);

  if (articleSpecs.length === 0 && blockSpecs.length === 0) {
    if (hasContent) {
      return NextResponse.json({ message: SUCCESS_MESSAGE, blocks: [] });
    }

    return NextResponse.json(
      {
        error:
          "Tarjima qilinadigan matn topilmadi. Kamida bitta tilda sarlavha yoki tavsif kiriting.",
      },
      { status: 400 }
    );
  }

  const result: Record<string, unknown> = {};

  try {
    // ── Article-level translation ──────────────────────────────────────────────
    if (articleSpecs.length > 0) {
      Object.assign(result, await translateArticleSpecs(apiKey, articleSpecs));
    }

    // ── Block-level translation ────────────────────────────────────────────────
    if (blockSpecs.length > 0) {
      result.blocks = await translateBlockSpecs(apiKey, blockSpecs);
    }

    result.message = SUCCESS_MESSAGE;
    return NextResponse.json(result);
  } catch (err) {
    const response = translationErrorResponse(err);
    if (response) return response;

    console.error('[translate] Unexpected error:', err);
    return NextResponse.json(
      { error: "Kutilmagan xatolik yuz berdi. Keyinroq urinib ko'ring." },
      { status: 500 }
    );
  }
}
