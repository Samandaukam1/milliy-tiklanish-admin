import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const articleId = searchParams.get('id');
  const limit = parseInt(searchParams.get('limit') ?? '5', 10);

  if (!articleId) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.json({ related: [] });
  }

  const supabase = createClient(url, key);

  // Fetch current article's tags, keywords, category
  const { data: article } = await supabase
    .from('articles')
    .select('tags, keywords, category_id')
    .eq('id', articleId)
    .single();

  if (!article) {
    return NextResponse.json({ related: [] });
  }

  const tags: string[] = article.tags ?? [];
  const keywords: string[] = article.keywords ?? [];
  const allTerms = [...new Set([...tags, ...keywords])];

  let related: { id: string; title_uz: string; featured_image_url: string | null }[] = [];

  // Try tag/keyword overlap first (PostgreSQL GIN array overlap operator &&)
  if (allTerms.length > 0) {
    const { data } = await supabase
      .from('articles')
      .select('id, title_uz, featured_image_url')
      .neq('id', articleId)
      .eq('is_published', true)
      .or(`tags.ov.{${allTerms.join(',')}},keywords.ov.{${allTerms.join(',')}}`)
      .limit(limit);
    related = data ?? [];
  }

  // Fall back to same category if not enough
  if (related.length < limit && article.category_id) {
    const existingIds = related.map((r) => r.id);
    const needed = limit - related.length;
    const { data } = await supabase
      .from('articles')
      .select('id, title_uz, featured_image_url')
      .neq('id', articleId)
      .eq('is_published', true)
      .eq('category_id', article.category_id)
      .not('id', 'in', `(${[articleId, ...existingIds].join(',')})`)
      .order('created_at', { ascending: false })
      .limit(needed);
    related = [...related, ...(data ?? [])];
  }

  return NextResponse.json({ related });
}
