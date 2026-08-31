import type { BlogPost } from '../types';

const RAW_WP_URL = 'https://aliceblue-ostrich-528771.hostingersite.com/wp-json/wp/v2/posts';
const WP_URL = RAW_WP_URL.replace(/\/posts\/?$/, '').replace(/\/$/, '');

export interface WPCategory {
  id: number;
  name: string;
  slug: string;
  count: number;
}

export interface WPTag {
  id: number;
  name: string;
  slug: string;
  count: number;
}

interface WPEmbeddedMedia {
  source_url?: string;
}

interface WPEmbeddedAuthor {
  name?: string;
}

interface WPEmbeddedTerm {
  id: number;
  name: string;
}

interface WPPost {
  id: number;
  slug: string;
  date: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
  _embedded?: {
    'wp:featuredmedia'?: WPEmbeddedMedia[];
    'wp:term'?: WPEmbeddedTerm[][];
    author?: WPEmbeddedAuthor[];
  };
}

const cleanHtml = (html: string): string => {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
};

const mapWPPostToBlogPost = (wp: WPPost): BlogPost => {
  const featuredImage =
    wp._embedded?.['wp:featuredmedia']?.[0]?.source_url ??
    'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?q=80&w=800';

  const categoryObj = wp._embedded?.['wp:term']?.[0]?.[0];
  const category = categoryObj?.name ?? 'Uncategorized';
  const catId = categoryObj?.id;

  const tags =
    wp._embedded?.['wp:term']?.[1]?.map((t) => t.name) ?? [];

  const rawExcerpt = cleanHtml(wp.excerpt?.rendered || '');
  const rawContent = cleanHtml(wp.content?.rendered || '');

  const finalExcerpt =
    rawExcerpt.length > 20
      ? rawExcerpt
      : rawContent.substring(0, 160).replace(/\s+/g, ' ') + '...';

  // Estimate read time
  const wordCount = rawContent.split(/\s+/).length;
  const readTime = `${Math.ceil(wordCount / 200)} min read`;

  return {
    id: wp.id.toString(),
    title: cleanHtml(wp.title?.rendered || ''),
    excerpt: finalExcerpt,
    content: wp.content?.rendered || '',
    date: new Date(wp.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).toUpperCase(),
    author: wp._embedded?.author?.[0]?.name ?? 'Allianza Team',
    category,
    categoryId: catId,
    tags,
    image: featuredImage,
    slug: wp.slug,
    readTime,
  };
};

export const fetchWordPressCategories = async (): Promise<WPCategory[]> => {
  try {
    const response = await fetch(`${WP_URL}/categories?per_page=100&hide_empty=true`);
    if (!response.ok) return [];
    return (await response.json()) as WPCategory[];
  } catch (error) {
    console.error('Fetch Categories Error:', error);
    return [];
  }
};

export const fetchWordPressTags = async (): Promise<WPTag[]> => {
  try {
    const response = await fetch(`${WP_URL}/tags?per_page=20&orderby=count&order=desc`);
    if (!response.ok) return [];
    return (await response.json()) as WPTag[];
  } catch (error) {
    console.error('Fetch Tags Error:', error);
    return [];
  }
};

export const fetchWordPressPostById = async (idOrSlug: string): Promise<BlogPost | null> => {
  try {
    let url = `${WP_URL}/posts/${idOrSlug}?_embed`;
    let response = await fetch(url);
    if (!response.ok) {
      url = `${WP_URL}/posts?slug=${encodeURIComponent(idOrSlug)}&_embed`;
      response = await fetch(url);
      if (!response.ok) return null;
      const posts = (await response.json()) as WPPost[];
      if (!posts || posts.length === 0) return null;
      return mapWPPostToBlogPost(posts[0]);
    }
    const wp = (await response.json()) as WPPost;
    return mapWPPostToBlogPost(wp);
  } catch (error) {
    console.error('Fetch Single Post Error:', error);
    return null;
  }
};

export const fetchWordPressPosts = async (
  page = 1,
  perPage = 10,
  categoryId?: number,
  tagId?: number,
  searchQuery?: string
): Promise<{ posts: BlogPost[]; total: number }> => {
  try {
    let url = `${WP_URL}/posts?page=${page}&per_page=${perPage}&_embed`;
    if (categoryId) {
      url += `&categories=${categoryId}`;
    }
    if (tagId) {
      url += `&tags=${tagId}`;
    }
    if (searchQuery) {
      url += `&search=${encodeURIComponent(searchQuery)}`;
    }
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch WordPress posts');

    const total = parseInt(response.headers.get('X-WP-Total') ?? '0', 10);
    const wpPosts = (await response.json()) as WPPost[];

    const mappedPosts: BlogPost[] = wpPosts.map(mapWPPostToBlogPost);

    return { posts: mappedPosts, total };
  } catch (error) {
    console.error('WordPress Fetch Error:', error);
    return { posts: [], total: 0 };
  }
};
