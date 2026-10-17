import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';

let dir: string;
const network = vi.fn(() => Promise.reject(new Error('Network must not be used')));
beforeEach(async () => {
  vi.resetModules(); network.mockClear();
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'starlight-local-'));
  vi.stubEnv('MDBLIST_CACHE_DIR', path.join(dir, 'mdb'));
  vi.stubEnv('RECOMMEND_CACHE_DIR', path.join(dir, 'recommendations'));
  vi.stubEnv('MDBLIST_API_KEY', '');
  vi.stubEnv('RECOMMEND_LOCAL_ONLY', '1');
  vi.stubGlobal('fetch', network);
  await fs.mkdir(path.join(dir, 'mdb'), { recursive: true });
  await fs.mkdir(path.join(dir, 'recommendations/posters'), { recursive: true });
});
afterEach(async () => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); await fs.rm(dir, { recursive: true, force: true }); });

describe('local recommendations without provider access', () => {
  it('serves expired MDBList data with no key and preserves the source date', async () => {
    const feed = { items: [{ id: 'mdb-movie-1', title: 'Local movie' }], fetchedAt: 123 };
    await fs.writeFile(path.join(dir, 'mdb/movie.json'), JSON.stringify(feed));
    const { getMDBFeed } = await import('./mdblist');
    expect(await getMDBFeed('movie')).toEqual({ ...feed, stale: true, localOnly: true });
    expect(network).not.toHaveBeenCalled();
  });
  it('never refreshes even when upgrading an installation with an existing key', async () => {
    vi.stubEnv('MDBLIST_API_KEY', 'test-only-key');
    const feed = { items: [{ id: 'mdb-show-2', title: 'Local show' }], fetchedAt: 1 };
    await fs.writeFile(path.join(dir, 'mdb/show.json'), JSON.stringify(feed));
    const { getMDBFeed, extendMDBFeed } = await import('./mdblist');
    expect((await getMDBFeed('show')).items).toEqual(feed.items);
    expect((await extendMDBFeed('show')).done).toBe(true);
    const { warmCacheStep } = await import('./tv-cache-library');
    expect(await warmCacheStep()).toMatchObject({ localOnly: true, done: true });
    expect(network).not.toHaveBeenCalled();
  });
  it('paginates the bundled catalog at any page size and ends without a network fallback', async () => {
    const items = Array.from({ length: 55 }, (_, i) => ({ id: String(i), title: 'Movie '+i, cover: '' }));
    await fs.writeFile(path.join(dir, 'recommendations/local-catalog.json'), JSON.stringify({ 'movie:热门': { items, fetchedAt: 123 } }));
    const { fetchDoubanFeed } = await import('./douban');
    expect((await fetchDoubanFeed('movie', '热门', 25, 25)).items).toEqual(items.slice(25, 50));
    expect((await fetchDoubanFeed('movie', '热门', 60, 30)).items).toEqual([]);
    expect((await fetchDoubanFeed('movie', 'unknown', 0, 30)).items).toEqual([]);
    expect(network).not.toHaveBeenCalled();
  });
  it('serves local posters and refuses uncached posters without contacting their host', async () => {
    const url = 'https://example.com/poster.jpg';
    const name = createHash('sha256').update(url).digest('hex')+'.json';
    await fs.writeFile(path.join(dir, 'recommendations/posters', name), JSON.stringify({ type: 'image/jpeg', body: 'aGVsbG8=' }));
    const { getPoster } = await import('./poster-cache');
    expect(await getPoster(url)).toMatchObject({ cached: true, body: 'aGVsbG8=' });
    await expect(getPoster('https://example.com/missing.jpg')).rejects.toThrow('not included');
    expect(network).not.toHaveBeenCalled();
  });
  it('reports a missing local dataset instead of attempting paid API access', async () => {
    const { getMDBFeed } = await import('./mdblist');
    await expect(getMDBFeed('movie')).rejects.toThrow('尚无本地');
    expect(network).not.toHaveBeenCalled();
  });
});
