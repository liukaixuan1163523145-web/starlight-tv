import { promises as fs } from 'node:fs';
import path from 'node:path';

type MediaType = 'movie' | 'show';
interface Rating { source: string; value: number | null; votes?: number; url?: string; }
interface Media { id?: number; ids?: { tmdb?: number; imdb?: string }; title: string; title_en?: string; type?: string; mediatype?: string; year?: number; release_year?: number; adult?: number; poster?: string; ratings?: Rating[]; }
export interface MDBItem { id: string; title: string; titleEn?: string; year: number; cover: string; isTv: boolean; tomatoes: number; popcorn: number | null; criticVotes: number; ratingUrl: string | null; }
interface Feed { items: MDBItem[]; fetchedAt: number; }
interface Progress { cursor?: string; pages: number; done: boolean; updatedAt: number; }
const TTL = 7 * 24 * 60 * 60 * 1000;
const memory = new Map<MediaType, Feed>();
const pending = new Map<MediaType, Promise<Feed>>();
let blockedUntil = 0;
const retryAfter = new Map<MediaType, number>();
const cacheDir = () => process.env.MDBLIST_CACHE_DIR || path.join(process.cwd(), '.mdblist-cache');
let remaining: number | null = null;
let quotaReset = 0;
export function getMDBQuota() { return { remaining, blockedUntil }; }

export function percent(ratings: Rating[] | undefined, source: string): number | null {
  const v = ratings?.find(r => r.source === source)?.value;
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100 ? v : null;
}
export function joinMedia(catalog: Media[], details: Media[], type: MediaType): MDBItem[] {
  const byId = new Map(details.map(d => [String(d.ids?.tmdb), d]));
  return catalog.flatMap(c => {
    const id = c.ids?.tmdb || c.id, d = byId.get(String(id));
    const year = c.release_year;
    if (!id || !d || d.type !== type || c.mediatype !== type || c.adult || !year || year !== d.year || !c.title) return [];
    const tomatoes = percent(d.ratings, 'tomatoes');
    const rt = d.ratings?.find(r => r.source === 'tomatoes');
    if (tomatoes === null || !rt?.votes || rt.votes < 10) return [];
    return [{ id: 'mdb-' + type + '-' + id, title: c.title, titleEn: c.title_en, year,
      cover: c.poster || '', isTv: type === 'show', tomatoes, popcorn: percent(d.ratings, 'popcorn'),
      criticVotes: rt.votes, ratingUrl: typeof rt.url === 'string' && /^\/[mtv]\//.test(rt.url) ? 'https://www.rottentomatoes.com' + rt.url : null }];
  });
}
async function request<T>(route: string, params: Record<string, string>, body?: object): Promise<T> {
  const key = process.env.MDBLIST_API_KEY;
  if (!key) throw new Error('MDBList 尚未配置');
  if (quotaReset && Date.now() >= quotaReset) { remaining=null;quotaReset=0; }
  if (Date.now() < blockedUntil) throw new Error('MDBList 配额暂时用完，请稍后重试');
  if (remaining !== null && remaining < 100) throw new Error('已为日常使用预留 MDBList 额度，稍后继续缓存');
  const url = new URL(route, 'https://api.mdblist.com');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  url.searchParams.set('apikey', key);
  let response: Response;
  try {
    response = await fetch(url, { method: body ? 'POST' : 'GET', body: body ? JSON.stringify(body) : undefined,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': 'LibreTV-MDBList/1.0' },
      redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(25000) });
  } catch { throw new Error('MDBList 暂时无法连接'); }
  const header = response.headers.get('X-RateLimit-Remaining');
  if (header !== null && Number.isFinite(Number(header))) remaining = Number(header);
  quotaReset=Number(response.headers.get('X-RateLimit-Reset'))*1000 || (Math.floor(Date.now()/86400000)+1)*86400000;
  if (!response.ok) {
    if (response.status === 429) {
      const seconds = Number(response.headers.get('Retry-After'));
      blockedUntil = Date.now() + (Number.isFinite(seconds) && seconds > 0 ? seconds : 300) * 1000;
    }
    throw new Error(response.status === 401 || response.status === 403 ? 'MDBList 密钥或访问权限需要检查' : response.status === 429 ? 'MDBList 配额暂时用完，请稍后重试' : 'MDBList 数据暂时不可用');
  }
  try { return await response.json() as T; } catch { throw new Error('MDBList 返回格式异常'); }
}
async function readFeed(type: MediaType): Promise<Feed | undefined> {
  if (memory.has(type)) return memory.get(type);
  try { const saved = JSON.parse(await fs.readFile(path.join(cacheDir(), type + '.json'), 'utf8')); if (Array.isArray(saved.items)) { memory.set(type, saved); return saved; } } catch { /* first use */ }
}
async function refresh(type: MediaType, cursor?: string, pages = 0): Promise<Feed> {
  // Fixed queries: free accounts have a small rolling quota for unique catalogs.
  const catalog = await request<{ movies?: Media[]; shows?: Media[]; next_cursor?: string; pagination?: { next_cursor?: string; has_more?: boolean } }>('/catalog/' + type,
    { lang: 'zh', limit: '100', sort: 'imdbvotes', sort_order: 'desc', append_to_response: 'poster,ratings', ...(cursor ? { cursor } : {}) });
  const rows = (type === 'movie' ? catalog.movies : catalog.shows) || [];
  const details: Media[] = [];
  for (let i = 0; i < rows.length; i += 20) {
    const ids = rows.slice(i, i + 20).map(r => r.ids?.tmdb || r.id).filter(Boolean);
    if (ids.length) {
      const batch = await request<Media[]>('/tmdb/' + type + '/', {}, { ids });
      if (!Array.isArray(batch)) throw new Error('MDBList 返回格式异常');
      details.push(...batch);
    }
  }
  const joined = joinMedia(rows, details, type), old = await readFeed(type);
  const merged = new Map((old?.items || []).map(item => [item.id, item]));
  joined.forEach(item => merged.set(item.id, item));
  const feed = { items: [...merged.values()].slice(0, 3000), fetchedAt: Date.now() };
  if (!feed.items.length) throw new Error('MDBList 片单暂时没有可核实的烂番茄评分');
  memory.set(type, feed);
  await fs.mkdir(cacheDir(), { recursive: true }); const file = path.join(cacheDir(), type + '.json'); await fs.writeFile(file + '.tmp', JSON.stringify(feed), { mode: 0o600 }); await fs.rename(file + '.tmp', file);
  const next = catalog.pagination?.next_cursor || catalog.next_cursor;
  const progress: Progress = { cursor: next, pages: pages + 1, done: !next || next === cursor || pages + 1 >= 30 || feed.items.length >= 3000, updatedAt: Date.now() };
  await fs.writeFile(path.join(cacheDir(), 'progress-' + type + '.json'), JSON.stringify(progress), { mode: 0o600 });
  return feed;
}
export async function extendMDBFeed(type: MediaType) {
  if (process.env.RECOMMEND_LOCAL_ONLY === '1' || !process.env.MDBLIST_API_KEY) return { done: true, feed: await readFeed(type) };
  let progress: Progress | undefined;
  try { progress = JSON.parse(await fs.readFile(path.join(cacheDir(), 'progress-' + type + '.json'), 'utf8')); } catch { /* initial expansion */ }
  if (progress?.done && Date.now() - progress.updatedAt < TTL) return { done: true, feed: await readFeed(type) };
  if (pending.has(type)) return { done: false, feed: await pending.get(type) };
  const job = refresh(type, progress?.done ? undefined : progress?.cursor, progress?.done ? 0 : progress?.pages || 0).finally(() => pending.delete(type));
  pending.set(type, job);return { done: false, feed: await job };
}
export async function getMDBFeed(type: MediaType): Promise<Feed & { stale: boolean; localOnly?: boolean }> {
  let old = memory.get(type);
  if (!old) { try { const saved = JSON.parse(await fs.readFile(path.join(cacheDir(), type + '.json'), 'utf8')) as Feed; if (Array.isArray(saved.items) && typeof saved.fetchedAt === 'number') { old = saved; memory.set(type, saved); } } catch { /* first use */ } }
  if (process.env.RECOMMEND_LOCAL_ONLY === '1' || !process.env.MDBLIST_API_KEY) {
    if (old) return { ...old, stale: Date.now() - old.fetchedAt >= TTL, localOnly: true };
    throw new Error('尚无本地烂番茄数据，请安装包含本地数据的版本');
  }
  if (old && Date.now() - old.fetchedAt < TTL) return { ...old, stale: false };
  let job = pending.get(type);
  if (!job && Date.now() >= (retryAfter.get(type) || 0)) { job = refresh(type).catch(error => { retryAfter.set(type, Date.now() + 900000); throw error; }).finally(() => { pending.delete(type); }); pending.set(type, job); }
  if (old) { if (job) void job.catch(() => {}); return { ...old, stale: true }; }
  if (!job) throw new Error('MDBList 暂时无法更新，请稍后重试');
  return { ...await job, stale: false };
}
