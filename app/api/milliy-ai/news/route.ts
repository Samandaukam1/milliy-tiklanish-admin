import { NextRequest, NextResponse } from "next/server";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface NewsSource {
  name: string;
  url: string;
  title?: string;
  published_at?: string;
}

export interface NewsRequest {
  articleCount: number;
  region: "uzbekistan" | "world" | "mixed";
  category?: string;
  topic?: string;
  noTopicMode: boolean;
  regenNewsType?: "uzbekistan" | "world";
}

export interface GeneratedNews {
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
  news_type: "uzbekistan" | "world";
  event_date: string;
  image_suggestion_1: string;
  image_suggestion_2: string;
  image_suggestion_3: string;
  sources: NewsSource[];
}

interface SourceSearchResult {
  sources: NewsSource[];
}

// ── Category english map ───────────────────────────────────────────────────────

const CATEGORY_EN: Record<string, string> = {
  siyosat: "Politics",
  iqtisodiyot: "Economics",
  jamiyat: "Society",
  sport: "Sports",
  texnologiya: "Technology",
  madaniyat: "Culture",
  talim: "Education",
  sogliq: "Health",
  boshqa: "General",
};

// ── Trusted sources ────────────────────────────────────────────────────────────

const UZ_SOURCES = [
  { name: "Kun.uz", domain: "kun.uz" },
  { name: "UzA", domain: "uza.uz" },
  { name: "Daryo.uz", domain: "daryo.uz" },
  { name: "Prezident.uz", domain: "prezident.uz" },
  { name: "Qalampir.uz", domain: "qalampir.uz" },
  { name: "Zamon.uz", domain: "zamon.uz" },
];

const WORLD_SOURCES = [
  { name: "BBC", domain: "bbc.com" },
  { name: "Reuters", domain: "reuters.com" },
  { name: "Al Jazeera", domain: "aljazeera.com" },
  { name: "CNN", domain: "cnn.com" },
  { name: "AP News", domain: "apnews.com" },
  { name: "AFP", domain: "afp.com" },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function getAllowedDomains(
  region: NewsRequest["region"],
  regenNewsType?: NewsRequest["regenNewsType"]
): string[] {
  if (regenNewsType === "uzbekistan") {
    return UZ_SOURCES.map((s) => s.domain);
  }
  if (regenNewsType === "world") {
    return WORLD_SOURCES.map((s) => s.domain);
  }

  if (region === "uzbekistan") return UZ_SOURCES.map((s) => s.domain);
  if (region === "world") return WORLD_SOURCES.map((s) => s.domain);

  return [...UZ_SOURCES.map((s) => s.domain), ...WORLD_SOURCES.map((s) => s.domain)];
}

function getAllowedSourceNames(
  region: NewsRequest["region"],
  regenNewsType?: NewsRequest["regenNewsType"]
): string {
  const domains = getAllowedDomains(region, regenNewsType);
  const all = [...UZ_SOURCES, ...WORLD_SOURCES].filter((s) => domains.includes(s.domain));
  return all.map((s) => `${s.name} (${s.domain})`).join(", ");
}

function normalizeUrl(input: string): string | null {
  try {
    const url = new URL(input.trim());
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function hostnameMatchesAllowed(url: string, allowedDomains: string[]): boolean {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return allowedDomains.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

function dedupeSources(sources: NewsSource[]): NewsSource[] {
  const seen = new Set<string>();
  const result: NewsSource[] = [];

  for (const source of sources) {
    const normalized = normalizeUrl(source.url);
    if (!normalized) continue;
    if (seen.has(normalized)) continue;

    seen.add(normalized);
    result.push({
      ...source,
      url: normalized,
    });
  }

  return result;
}

function validateSources(
  sources: NewsSource[],
  region: NewsRequest["region"],
  regenNewsType?: NewsRequest["regenNewsType"]
): NewsSource[] {
  const allowedDomains = getAllowedDomains(region, regenNewsType);

  return dedupeSources(sources).filter(
    (source) => source.url && hostnameMatchesAllowed(source.url, allowedDomains)
  );
}

function buildSourceSearchPrompt(req: NewsRequest): string {
  const { articleCount, region, category, topic, noTopicMode, regenNewsType } = req;

  const categoryLine =
    category && CATEGORY_EN[category]
      ? `Preferred category: ${CATEGORY_EN[category]} (category_hint: "${category}").`
      : "Category is not fixed. Choose the most appropriate editorial category.";

  let regionLine = "";
  if (regenNewsType) {
    regionLine =
      regenNewsType === "uzbekistan"
        ? "Find sources ONLY for Uzbekistan news."
        : "Find sources ONLY for world/international news.";
  } else if (region === "uzbekistan") {
    regionLine = "Find sources ONLY for Uzbekistan news.";
  } else if (region === "world") {
    regionLine = "Find sources ONLY for world/international news.";
  } else {
    regionLine =
      "Find a mix of Uzbekistan and world news sources if needed, based on the request.";
  }

  const topicLine =
    !noTopicMode && req.topic?.trim()
      ? `Topic: "${req.topic.trim()}". Find sources specifically about this topic/event.`
      : "No topic provided. Choose the most important and recent news topic(s) from today, or if unavailable, yesterday.";

  const allowedSources = getAllowedSourceNames(region, regenNewsType);

  return `
You are a strict newsroom source-finder for Milliy Tiklanish.

TASK:
Find real, recent, reliable news sources before any article is written.

RULES:
- Search the web first.
- Use ONLY trusted sources from this allowed list:
${allowedSources}
- Prefer TODAY'S news. If today's coverage is not available, use YESTERDAY'S.
- Find sources relevant to exactly ${articleCount} article request(s).
- NEVER invent URLs.
- NEVER guess URLs.
- ONLY return URLs actually found during web search.
- If fewer than 2 reliable sources are found, return {"sources":[]}

${regionLine}
${categoryLine}
${topicLine}

Return ONLY valid JSON in this exact shape:
{
  "sources": [
    {
      "name": "Source name",
      "url": "https://real-url-from-search",
      "title": "Source article title",
      "published_at": "ISO date or readable date if available"
    }
  ]
}

No markdown.
No explanation.
`.trim();
}

function buildNewsWritingPrompt(
  req: NewsRequest,
  sources: NewsSource[]
): string {
  const { articleCount, region, category, topic, noTopicMode, regenNewsType } = req;

  const categoryLine =
    category && CATEGORY_EN[category]
      ? `All generated news must use category_hint "${category}" (${CATEGORY_EN[category]}).`
      : "Choose the most appropriate category_hint for each item from: siyosat, iqtisodiyot, jamiyat, sport, texnologiya, madaniyat, talim, sogliq, boshqa.";

  let regionLine: string;
  if (regenNewsType) {
    regionLine =
      regenNewsType === "uzbekistan"
        ? 'All output items must have news_type "uzbekistan".'
        : 'All output items must have news_type "world".';
  } else if (region === "uzbekistan") {
    regionLine = 'All output items must have news_type "uzbekistan".';
  } else if (region === "world") {
    regionLine = 'All output items must have news_type "world".';
  } else {
    regionLine =
      articleCount === 1
        ? 'Choose the best-fitting news_type: "uzbekistan" or "world".'
        : "Use the provided sources and assign the correct news_type per item.";
  }

  const topicLine =
    !noTopicMode && topic?.trim()
      ? `Requested topic: "${topic.trim()}". Stay strictly on that topic.`
      : "No topic was provided. Use the retrieved sources to choose the strongest news angle.";

  const serializedSources = JSON.stringify(sources, null, 2);

  return `
You are a professional news editor at “Milliy Tiklanish”.

IMPORTANT:
You have already been given trusted real sources.
You MUST write ONLY from these sources.
You MUST NOT invent any facts.
You MUST NOT invent any URLs.
You MUST use ONLY the exact source URLs provided below.

REQUEST:
Generate exactly ${articleCount} fact-based news report(s).

${regionLine}
${categoryLine}
${topicLine}

SOURCE LIST (use only these exact sources):
${serializedSources}

WRITING RULES:
1. This is NEWS, not opinion.
2. The first paragraph in paragraphs_uz MUST begin with a source-based phrase such as:
   - "Kun.uz xabariga ko'ra, ..."
   - "Prezident.uz saytida e'lon qilingan ma'lumotlarga ko'ra, ..."
   - "Reuters agentligi tarqatgan ma'lumotlarga ko'ra, ..."
   - "BBC nashrining yozishicha, ..."
3. Include concrete facts, exact details, place names, institutions, people, dates, and numbers when available.
4. Do not exaggerate.
5. Do not speculate.
6. If a fact is not supported by the sources, do not include it.
7. event_date should be in Uzbek style, for example: "2026-yil 21-aprel"

CONTENT RULES:
- PRO-quality factual newsroom writing
- 4–6 detailed paragraphs
- Uzbek Latin, Uzbek Cyrillic, Russian, and English versions
- Titles must be factual and strong
- Summaries must be concise and accurate

IMAGE SUGGESTIONS:
For each news item, give exactly 3 newsroom-appropriate image suggestions in Uzbek.

SOURCE RULE:
- Each article's "sources" field must contain ONLY the exact real sources used from the source list above.
- Do not modify or fabricate URLs.

Return ONLY valid JSON:
{
  "articles": [
    {
      "title_uz": "...",
      "title_uz_cy": "...",
      "title_ru": "...",
      "title_en": "...",
      "summary_uz": "...",
      "summary_uz_cy": "...",
      "summary_ru": "...",
      "summary_en": "...",
      "paragraphs_uz": ["..."],
      "paragraphs_uz_cy": ["..."],
      "paragraphs_ru": ["..."],
      "paragraphs_en": ["..."],
      "category_hint": "siyosat",
      "news_type": "uzbekistan",
      "event_date": "2026-yil 21-aprel",
      "image_suggestion_1": "...",
      "image_suggestion_2": "...",
      "image_suggestion_3": "...",
      "sources": [
        {
          "name": "Kun.uz",
          "url": "https://exact-real-url"
        }
      ]
    }
  ]
}

No markdown.
No explanation.
`.trim();
}

// ── OpenAI Responses API call ──────────────────────────────────────────────────

async function callResponsesAPI(
  apiKey: string,
  input: string,
  useWebSearch = false
): Promise<string | null> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1",
      input,
      tools: useWebSearch ? [{ type: "web_search" }] : [],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("[milliy-ai/news] OpenAI API error:", response.status, errText);
    return null;
  }

  const data = await response.json();
  console.log("OPENAI RAW RESPONSE:", JSON.stringify(data, null, 2));

  const text =
    data.output?.[0]?.content?.[0]?.text ||
    data.output_text ||
    null;

  return text;
}

// ── Route handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI xizmati sozlanmagan. OPENAI_API_KEY mavjud emas." },
      { status: 500 }
    );
  }

  let body: NewsRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Noto'g'ri so'rov formati." },
      { status: 400 }
    );
  }

  const safeBody: NewsRequest = {
    ...body,
    articleCount: Math.min(Math.max(Number(body.articleCount) || 1, 1), 10),
  };

  // 1) Source retrieval (web search step)
  let safeSources: NewsSource[] = [];
  let fallbackMode = false;

  try {
    const sourcePrompt = buildSourceSearchPrompt(safeBody);
    const sourceText = await callResponsesAPI(apiKey, sourcePrompt, true);

    if (!sourceText) {
      console.warn("[milliy-ai/news] OpenAI web search ishlamadi — fallback rejim");
      fallbackMode = true;
    } else {
      let parsedSources: SourceSearchResult;
      try {
        parsedSources = JSON.parse(sourceText);
      } catch {
        console.error("[milliy-ai/news] Source JSON parse xato:", sourceText.slice(0, 800));
        fallbackMode = true;
        parsedSources = { sources: [] };
      }

      safeSources = validateSources(
        Array.isArray(parsedSources.sources) ? parsedSources.sources : [],
        safeBody.region,
        safeBody.regenNewsType
      );

      if (safeSources.length < 2) {
        console.warn("[milliy-ai/news] Yetarli manba topilmadi — fallback rejim");
        fallbackMode = true;
      }
    }
  } catch (err) {
    console.error("[milliy-ai/news] Web search exception:", err);
    fallbackMode = true;
  }

  // 2) Write news (with or without sources)
  const writingPrompt = fallbackMode
    ? buildFallbackWritingPrompt(safeBody)
    : buildNewsWritingPrompt(safeBody, safeSources);

  const contentText = await callResponsesAPI(apiKey, writingPrompt, false);

  if (!contentText) {
    return NextResponse.json(
      { error: "AI javobi qaytmadi. Iltimos qayta urinib ko'ring." },
      { status: 502 }
    );
  }

  let parsedNews: { articles: GeneratedNews[] };
  try {
    // Strip markdown code fences if present
    const cleaned = contentText.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
    parsedNews = JSON.parse(cleaned);
  } catch {
    console.error("[milliy-ai/news] News JSON parse xato:", contentText.slice(0, 800));
    return NextResponse.json(
      { error: "AI javobi JSON formatida emas. Qayta urinib ko'ring." },
      { status: 502 }
    );
  }

  if (!Array.isArray(parsedNews.articles) || parsedNews.articles.length === 0) {
    return NextResponse.json(
      { error: "AI maqolalar ro'yxatini qaytarmadi. Qayta urinib ko'ring." },
      { status: 502 }
    );
  }

  // Final safety: article sources must also be validated
  const sanitizedArticles = parsedNews.articles.map((article) => ({
    ...article,
    sources: validateSources(article.sources || [], safeBody.region, safeBody.regenNewsType),
  }));

  return NextResponse.json({
    articles: sanitizedArticles,
    retrieved_sources: safeSources,
    fallback: fallbackMode,
  });
}

// ── Fallback writing prompt (no real sources) ──────────────────────────────────

function buildFallbackWritingPrompt(req: NewsRequest): string {
  const { articleCount, region, category, topic, noTopicMode, regenNewsType } = req;

  const categoryLine =
    category && CATEGORY_EN[category]
      ? `All generated news must use category_hint "${category}" (${CATEGORY_EN[category]}).`
      : "Choose the most appropriate category_hint for each item from: siyosat, iqtisodiyot, jamiyat, sport, texnologiya, madaniyat, talim, sogliq, boshqa.";

  let regionLine: string;
  if (regenNewsType) {
    regionLine =
      regenNewsType === "uzbekistan"
        ? 'All output items must have news_type "uzbekistan".'
        : 'All output items must have news_type "world".';
  } else if (region === "uzbekistan") {
    regionLine = 'All output items must have news_type "uzbekistan".';
  } else if (region === "world") {
    regionLine = 'All output items must have news_type "world".';
  } else {
    regionLine =
      articleCount === 1
        ? 'Choose the best-fitting news_type: "uzbekistan" or "world".'
        : "Mix uzbekistan and world news as appropriate.";
  }

  const topicLine =
    !noTopicMode && topic?.trim()
      ? `Requested topic: "${topic.trim()}". Write about this topic.`
      : "No topic provided. Write about the most important current news.";

  return `
You are a professional news editor at "Milliy Tiklanish".

NOTE: Web search is unavailable. Write news based on your training knowledge.
Mark each article as approximate (taxminiy) in the summary.
Do NOT include any source URLs — leave sources as an empty array [].

REQUEST:
Generate exactly ${articleCount} news report(s).

${regionLine}
${categoryLine}
${topicLine}

WRITING RULES:
1. Factual, newsroom-style writing
2. 3–5 paragraphs per article
3. Uzbek Latin, Uzbek Cyrillic, Russian, and English versions
4. event_date: use approximate current date in Uzbek style, e.g. "2026-yil aprel"
5. Leave "sources" as []

Return ONLY valid JSON:
{
  "articles": [
    {
      "title_uz": "...",
      "title_uz_cy": "...",
      "title_ru": "...",
      "title_en": "...",
      "summary_uz": "(Taxminiy) ...",
      "summary_uz_cy": "...",
      "summary_ru": "...",
      "summary_en": "...",
      "paragraphs_uz": ["..."],
      "paragraphs_uz_cy": ["..."],
      "paragraphs_ru": ["..."],
      "paragraphs_en": ["..."],
      "category_hint": "siyosat",
      "news_type": "uzbekistan",
      "event_date": "2026-yil aprel",
      "image_suggestion_1": "...",
      "image_suggestion_2": "...",
      "image_suggestion_3": "...",
      "sources": []
    }
  ]
}

No markdown. No explanation.
`.trim();
}