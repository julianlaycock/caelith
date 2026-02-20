import { Router, Request, Response } from 'express';

const router = Router();

interface NewsArticle {
  title: string;
  source: string;
  sourceType: 'regulatory' | 'news';
  date: string;
  excerpt: string;
  url: string;
}

// RSS feed sources — regulatory and news relevant to EU fund compliance
const RSS_FEEDS: Array<{ url: string; source: string; sourceType: 'regulatory' | 'news' }> = [
  { url: 'https://www.bafin.de/SiteGlobals/Functions/RSSFeed/EN/RSSNewsfeed/RSSNewsfeed.xml', source: 'BaFin', sourceType: 'regulatory' },
  { url: 'https://www.esma.europa.eu/rss', source: 'ESMA', sourceType: 'regulatory' },
  { url: 'https://www.ecb.europa.eu/rss/press.html', source: 'ECB', sourceType: 'regulatory' },
  { url: 'https://www.eba.europa.eu/rss-feeds', source: 'EBA', sourceType: 'regulatory' },
];

// Relevance keywords — articles must contain at least one
const KEYWORDS = [
  'aifmd', 'aifm', 'fund', 'fonds', 'kvg', 'kagb', 'aml', 'geldwäsche', 'anti-money',
  'compliance', 'investor', 'anleger', 'regulation', 'regulierung', 'directive',
  'richtlinie', 'leverage', 'risk', 'risiko', 'reporting', 'meldung', 'eltif',
  'ucits', 'ogaw', 'sfdr', 'esg', 'sustainable', 'nachhaltig', 'dora', 'ict',
  'bafin', 'esma', 'supervisory', 'aufsicht', 'enforcement', 'sanction',
  'kapitalverwaltung', 'spezialfonds', 'alternative investment', 'prospectus',
  'mifid', 'market abuse', 'transparency', 'annex iv', 'priips',
];

// In-memory cache
let cache: { articles: NewsArticle[]; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function parseXmlText(xml: string, tag: string): string {
  // Extract text content from an XML tag (handles CDATA)
  const regex = new RegExp(`<${tag}[^>]*>\\s*(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?\\s*</${tag}>`, 'i');
  const match = xml.match(regex);
  if (!match) return '';
  return match[1].replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '').replace(/<[^>]+>/g, '').trim();
}

function parseDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  } catch { /* ignore */ }
  return '';
}

function isRelevant(title: string, excerpt: string): boolean {
  const text = (title + ' ' + excerpt).toLowerCase();
  return KEYWORDS.some(kw => text.includes(kw));
}

async function fetchFeed(feed: typeof RSS_FEEDS[0]): Promise<NewsArticle[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    
    const res = await fetch(feed.url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Caelith/1.0 (Regulatory News Aggregator)' },
    });
    clearTimeout(timeout);
    
    if (!res.ok) return [];
    const xml = await res.text();
    
    // Parse items (works for both RSS <item> and Atom <entry>)
    const items: NewsArticle[] = [];
    
    // Try RSS format first
    const itemBlocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || [];
    for (const block of itemBlocks) {
      const title = parseXmlText(block, 'title');
      const link = block.match(/<link[^>]*>([^<]+)<\/link>/i)?.[1]?.trim() 
        || block.match(/<link[^>]*href="([^"]+)"/i)?.[1]?.trim()
        || '';
      const description = parseXmlText(block, 'description');
      const pubDate = parseXmlText(block, 'pubDate') || parseXmlText(block, 'dc:date');
      
      if (title && link) {
        items.push({
          title,
          source: feed.source,
          sourceType: feed.sourceType,
          date: parseDate(pubDate),
          excerpt: description.slice(0, 300),
          url: link,
        });
      }
    }
    
    // Try Atom format if no RSS items found
    if (items.length === 0) {
      const entryBlocks = xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || [];
      for (const block of entryBlocks) {
        const title = parseXmlText(block, 'title');
        const link = block.match(/<link[^>]*href="([^"]+)"/i)?.[1]?.trim() || '';
        const summary = parseXmlText(block, 'summary') || parseXmlText(block, 'content');
        const updated = parseXmlText(block, 'updated') || parseXmlText(block, 'published');
        
        if (title && link) {
          items.push({
            title,
            source: feed.source,
            sourceType: feed.sourceType,
            date: parseDate(updated),
            excerpt: summary.slice(0, 300),
            url: link,
          });
        }
      }
    }
    
    return items;
  } catch {
    console.warn(`[news] Failed to fetch ${feed.source}: ${feed.url}`);
    return [];
  }
}

async function fetchAllFeeds(): Promise<NewsArticle[]> {
  const results = await Promise.allSettled(RSS_FEEDS.map(f => fetchFeed(f)));
  const allArticles: NewsArticle[] = [];
  
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allArticles.push(...result.value);
    }
  }
  
  // Filter for relevance, deduplicate by title, sort by date desc
  const seen = new Set<string>();
  const filtered = allArticles
    .filter(a => {
      if (!a.title || !a.date) return false;
      // Only filter by relevance if we have enough articles
      if (allArticles.length > 30 && !isRelevant(a.title, a.excerpt)) return false;
      const key = a.title.toLowerCase().slice(0, 60);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 20);
  
  return filtered;
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const now = Date.now();
    
    if (cache && (now - cache.fetchedAt) < CACHE_TTL_MS) {
      return res.json({ articles: cache.articles, cachedAt: new Date(cache.fetchedAt).toISOString() });
    }
    
    const articles = await fetchAllFeeds();
    cache = { articles, fetchedAt: now };
    
    res.json({ articles, cachedAt: new Date(now).toISOString() });
  } catch (err) {
    console.error('[news] Error:', err);
    // Return cached data if available, even if stale
    if (cache) {
      return res.json({ articles: cache.articles, cachedAt: new Date(cache.fetchedAt).toISOString(), stale: true });
    }
    res.status(500).json({ error: 'Failed to fetch news feeds' });
  }
});

export default router;
