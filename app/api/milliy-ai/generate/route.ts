import { NextRequest, NextResponse } from 'next/server';

// ── Types ──────────────────────────────────────────────────────────────────────

export type GenerationMode = 'PRO' | 'TEZ' | 'MENING';
export type RegionFilter = 'uzbekistan' | 'world' | 'mixed';

export interface GenerateRequest {
  mode: GenerationMode;
  articleCount: number;
  region: RegionFilter;
  category?: string;
  topic?: string;
  noTopicMode: boolean;
  styleText?: string;
  /** Regenerate a single article: pass news_type so AI respects it */
  regenNewsType?: 'uzbekistan' | 'world';
}

export interface APIGeneratedArticle {
  title_uz: string;
  title_uz_cy: string;
  title_ru: string;
  title_en: string;
  summary_uz: string;
  summary_uz_cy: string;
  summary_ru: string;
  summary_en: string;
  paragraphs_uz: string[];
  paragraphs_uz_cy: string[];
  paragraphs_ru: string[];
  paragraphs_en: string[];
  category_hint: string;
  news_type: 'uzbekistan' | 'world';
  image_suggestion_1: string;
  image_suggestion_2: string;
  image_suggestion_3: string;
}

// ── Category english labels ────────────────────────────────────────────────────

const CATEGORY_EN: Record<string, string> = {
  siyosat: 'Politics',
  iqtisodiyot: 'Economics',
  jamiyat: 'Society',
  sport: 'Sports',
  texnologiya: 'Technology',
  madaniyat: 'Culture',
  talim: 'Education',
  sogliq: 'Health',
  boshqa: 'General',
};

// ── Prompt builder ─────────────────────────────────────────────────────────────

function buildPrompt(req: GenerateRequest): string {
  const { mode, articleCount, region, category, topic, noTopicMode, styleText, regenNewsType } =
    req;

  const countLine = `Generate exactly ${articleCount} news article${articleCount > 1 ? 's' : ''}.`;

  let regionLine: string;
  if (regenNewsType) {
    regionLine =
      regenNewsType === 'uzbekistan'
        ? 'This article must be about Uzbekistan news (news_type: "uzbekistan").'
        : 'This article must be about world/international news (news_type: "world").';
  } else if (region === 'uzbekistan') {
    regionLine = `All articles must be about Uzbekistan (news_type: "uzbekistan" for all).`;
  } else if (region === 'world') {
    regionLine = `All articles must be about world/international news (news_type: "world" for all).`;
  } else {
    if (articleCount === 1) {
      regionLine = 'Choose whichever region (uzbekistan or world) is most editorially relevant.';
    } else {
      const uzCount = Math.ceil(articleCount * 0.67);
      const wCount = articleCount - uzCount;
      regionLine = `Mix regions: approximately ${uzCount} article${uzCount > 1 ? 's' : ''} about Uzbekistan (news_type: "uzbekistan") and ${wCount} about world news (news_type: "world"). Vary the order editorially.`;
    }
  }

  const categoryLine =
    category && CATEGORY_EN[category]
      ? `All articles must belong to the category: "${CATEGORY_EN[category]}" (category_hint: "${category}"). Do not change the category_hint.`
      : 'Choose the most editorially appropriate category_hint for each article (valid values listed below).';

  let topicLine: string;
  if (!noTopicMode && topic?.trim()) {
    topicLine = `Topic focus: "${topic.trim()}". All articles must be directly related to this topic or direction.`;
  } else {
    topicLine =
      'No specific topic provided. Choose current, relevant, editorially strong news topics independently. Pick real, plausible, timely stories — as a real newsroom editor would decide.';
  }

  let styleBlock: string;
  if (mode === 'PRO') {
    styleBlock = `Writing style — PRO (Professional Journalism):
- Deep analysis, structured editorial writing, authoritative voice
- Critical thinking, expert perspective, cause-and-effect reasoning
- 4–6 well-developed paragraphs per article
- Include context, background, consequences, and implications
- Use specific details and expert-level insights
- Serious editorial tone, no oversimplification`;
  } else if (mode === 'TEZ') {
    styleBlock = `Writing style — TEZ (Fast News):
- Short, concise, extremely easy to read
- Direct language, clear sentences, conversational but professional
- 2–3 short paragraphs per article (3–5 sentences each)
- Only the most important facts — no filler
- Optimized for mobile and fast-scroll reading`;
  } else {
    const sample = styleText?.trim()
      ? `\nAnalyze and EXACTLY replicate the following writing style:\n"""\n${styleText.trim()}\n"""\nMatch: sentence length, tone, vocabulary level, paragraph rhythm, and overall feel.`
      : '\nUse a natural, personal journalistic tone — warm, direct, and slightly informal.';
    styleBlock = `Writing style — Mening Uslubim (Personal Style):${sample}`;
  }

  const imageLine = `For each article, provide 3 image suggestions (image_suggestion_1, image_suggestion_2, image_suggestion_3):
- Each is a clear, specific visual scene description in Uzbek language
- Must be newsroom-appropriate and help an editor find/select the right photo
- Be concrete: who/what/where, not abstract
- Example: "Toshkent shahridagi tirbandlik aks etgan zamonaviy ko'cha manzarasi"
- Example: "Rasmiy uchrashuv yoki parlament majlisida so'zlayotgan davlat arbobi"`;

  return `You are a senior journalist and editor at "Milliy Tiklanish" — Uzbekistan's leading national news portal.

TASK:
${countLine}
${regionLine}
${categoryLine}
${topicLine}

${styleBlock}

${imageLine}

LANGUAGE REQUIREMENTS:
- Write each article in 4 languages: Uzbek Latin (uz), Uzbek Cyrillic (uz_cy), Russian (ru), English (en)
- Uzbek Cyrillic: proper, natural Cyrillic transliteration of Uzbek Latin — correct orthography
- Russian: editorial and natural, not a literal word-for-word translation
- English: clear, professional journalism English
- Titles: compelling, specific, journalistic (no clickbait)
- Summaries: 1–2 strong sentences capturing the core story concisely
- Paragraphs: well-structured, information-dense body content

VALID category_hint values: siyosat, iqtisodiyot, jamiyat, sport, texnologiya, madaniyat, talim, sogliq, boshqa

Return ONLY a valid JSON object (no markdown fences, no explanation):
{
  "articles": [
    {
      "title_uz": "...", "title_uz_cy": "...", "title_ru": "...", "title_en": "...",
      "summary_uz": "...", "summary_uz_cy": "...", "summary_ru": "...", "summary_en": "...",
      "paragraphs_uz": ["..."], "paragraphs_uz_cy": ["..."], "paragraphs_ru": ["..."], "paragraphs_en": ["..."],
      "category_hint": "siyosat",
      "news_type": "uzbekistan",
      "image_suggestion_1": "...",
      "image_suggestion_2": "...",
      "image_suggestion_3": "..."
    }
  ]
}`;
}

// ── OpenAI call ────────────────────────────────────────────────────────────────

async function callOpenAI(apiKey: string, prompt: string): Promise<string | null> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.72,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('[milliy-ai] OpenAI error:', response.status, errText);
    return null;
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? null;
}

// ── Route handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI xizmati sozlanmagan. OPENAI_API_KEY mavjud emas.' },
      { status: 500 }
    );
  }

  let body: GenerateRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Noto'g'ri so'rov formati." }, { status: 400 });
  }

  const { mode } = body;
  if (!['PRO', 'TEZ', 'MENING'].includes(mode)) {
    return NextResponse.json({ error: "Noto'g'ri rejim tanlandi." }, { status: 400 });
  }

  const count = Math.min(Math.max(Number(body.articleCount) || 1, 1), 10);
  const safeBody: GenerateRequest = { ...body, articleCount: count };

  const prompt = buildPrompt(safeBody);
  const content = await callOpenAI(apiKey, prompt);

  if (!content) {
    return NextResponse.json(
      { error: "AI javobi olinmadi. Keyinroq urinib ko'ring." },
      { status: 502 }
    );
  }

  let parsed: { articles: APIGeneratedArticle[] };
  try {
    parsed = JSON.parse(content);
  } catch {
    console.error('[milliy-ai] JSON parse failed:', content.slice(0, 500));
    return NextResponse.json(
      { error: "AI javobi noto'g'ri formatda qaytdi." },
      { status: 502 }
    );
  }

  if (!Array.isArray(parsed.articles) || parsed.articles.length === 0) {
    return NextResponse.json(
      { error: 'AI maqolalar yaratishda xatolik yuz berdi.' },
      { status: 502 }
    );
  }

  return NextResponse.json({ articles: parsed.articles });
}
