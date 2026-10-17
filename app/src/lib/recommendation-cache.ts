import { promises as fs } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
export interface CachedFeed<T> { items: T[]; fetchedAt: number; stale?: boolean; refreshing?: boolean; }
export const recommendationRoot = () => process.env.RECOMMEND_CACHE_DIR || path.join(process.cwd(), '.recommendation-cache');
export function diskFeedCache<T>(namespace: string, ttl = 604800000, limit = 600) {
  const memory = new Map<string, CachedFeed<T>>(), pending = new Map<string, Promise<CachedFeed<T>>>(), retry = new Map<string, number>();
  const dir = () => path.join(recommendationRoot(), namespace);
  const id = (key: string) => createHash('sha256').update(key).digest('hex');
  async function save(key: string, feed: CachedFeed<T>) {
    memory.delete(key); memory.set(key, feed);
    while (memory.size > 24) memory.delete(memory.keys().next().value!);
    try {
      await fs.mkdir(dir(), { recursive: true });
      const file = path.join(dir(), id(key) + '.json');
      await fs.writeFile(file + '.tmp', JSON.stringify(feed), { mode: 0o600 }); await fs.rename(file + '.tmp', file);
      const files = await Promise.all((await fs.readdir(dir())).filter(n => /^[a-f0-9]{64}\.json$/.test(n)).map(async n => ({ n, time: (await fs.stat(path.join(dir(), n))).mtimeMs })));
      files.sort((a, b) => b.time - a.time);
      await Promise.all(files.slice(limit).map(f => fs.unlink(path.join(dir(), f.n)).catch(() => {})));
    } catch { /* retain working memory cache on disk failure */ }
  }
  return async (key: string, loader: () => Promise<T[]>): Promise<CachedFeed<T>> => {
    let old = memory.get(key);
    if (!old) { try { const saved = JSON.parse(await fs.readFile(path.join(dir(), id(key) + '.json'), 'utf8')); if (Array.isArray(saved.items) && Number.isFinite(saved.fetchedAt)) old = saved; } catch { /* first visit */ } }
    if (old && Date.now() - old.fetchedAt < ttl) return { ...old, stale: false, refreshing: false };
    let job = pending.get(key);
    if (!job && Date.now() >= (retry.get(key) || 0)) {
      job = (async () => { try { const items = await loader(); if (!Array.isArray(items)) throw Error('Invalid feed'); const result = { items, fetchedAt: Date.now() }; await save(key, result); retry.delete(key); return result; } catch (e) { retry.set(key, Date.now() + 900000); throw e; } finally { pending.delete(key); } })();
      pending.set(key, job);
    }
    if (old) { if (job) void job.catch(() => {}); return { ...old, stale: true, refreshing: !!job }; }
    if (job) return { ...await job, stale: false, refreshing: false };
    throw new Error('片单暂时无法更新，请稍后重试');
  };
}
