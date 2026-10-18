import { promises as fs } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fetchUpstream } from './fetch-utils';
import { recommendationRoot } from './recommendation-cache';
interface Poster { type: string; body: string; }
const pending = new Map<string, Promise<Poster>>();
const touched = new Map<string, number>();
const maxImage = 2 * 1024 * 1024, maxDisk = 512 * 1024 * 1024;
let lastPrune = 0, writes = 0;
const directory = () => path.join(recommendationRoot(), 'posters');
async function prune(dir: string) {
  if (++writes < 100 && Date.now() - lastPrune < 60000) return;
  writes = 0; lastPrune = Date.now();
  try {
    const files = await Promise.all((await fs.readdir(dir)).filter(n => /^[a-f0-9]{64}\.json$/.test(n)).map(async name => { const s = await fs.stat(path.join(dir, name)); return { name, size: s.size, time: s.mtimeMs }; }));
    files.sort((a,b) => b.time - a.time); let bytes = 0;
    for (let i = 0; i < files.length; i++) { bytes += files[i].size; if (bytes > maxDisk || i >= 8000) await fs.unlink(path.join(dir, files[i].name)).catch(() => {}); }
  } catch { /* best effort bounded cache maintenance */ }
}
export async function getPoster(url: string, source = false): Promise<Poster & { cached: boolean }> {
  if (url.length > 4096 || !/^https?:\/\//.test(url)) throw Error('Invalid poster URL');
  const key = createHash('sha256').update(url).digest('hex');
  const dir = source ? path.join(recommendationRoot(), 'source-posters') : directory();
  const file = path.join(dir, key + '.json');
  // Source artwork is stored separately so its eviction never removes bundled posters.
  for (const cachedFile of source ? [path.join(directory(), key + '.json'), file] : [file]) {
  try { const saved = JSON.parse(await fs.readFile(cachedFile, 'utf8')); if (/^image\/(jpeg|png|webp|gif|avif)$/.test(saved.type) && typeof saved.body === 'string' && saved.body.length <= maxImage * 1.4) {
    if (Date.now() - (touched.get(key) || 0) > 3600000) { touched.delete(key); touched.set(key, Date.now()); while(touched.size>8000)touched.delete(touched.keys().next().value!); const now=new Date();await fs.utimes(cachedFile,now,now).catch(()=>{}); }
    return { ...saved, cached: true };
  } } catch { /* cache miss */ }
  }
  if (process.env.RECOMMEND_LOCAL_ONLY === '1' && !source) throw Error('Poster not included in local snapshot');
  let job = pending.get(key);
  if (!job) {
    job = (async () => {
      // Preserve the existing proxy's public-poster request headers.
      const host = new URL(url).hostname.toLowerCase();
      const headers: Record<string, string> = { 'User-Agent': process.env.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36', Accept: 'image/*' };
      if (host === 'douban.com' || host.endsWith('.douban.com') || host === 'doubanio.com' || host.endsWith('.doubanio.com')) headers.Referer = 'https://movie.douban.com/';
      const response = await fetchUpstream(url, { timeoutMs: 12000, headers });
      const type = (response.headers.get('content-type') || '').split(';')[0].trim();
      if (!response.ok || !/^image\/(jpeg|png|webp|gif|avif)$/.test(type) || Number(response.headers.get('content-length')) > maxImage) { await response.body?.cancel(); throw Error('Poster unavailable'); }
      if (!response.body) throw Error('Empty poster');
      const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let total = 0;
      try { for (;;) { const part = await reader.read(); if (part.done) break; total += part.value.length; if (total > maxImage) throw Error('Poster too large'); chunks.push(part.value); } } finally { await reader.cancel().catch(() => {}); }
      if (!total) throw Error('Empty poster');
      const result = { type, body: Buffer.concat(chunks).toString('base64') };
      try { await fs.mkdir(dir, { recursive: true }); await fs.writeFile(file + '.tmp', JSON.stringify(result), { mode: 0o600 }); await fs.rename(file + '.tmp', file); await prune(dir); } catch { /* do not fail a valid image on storage errors */ }
      return result;
    })().finally(() => { pending.delete(key); });
    pending.set(key, job);
  }
  return { ...await job, cached: false };
}
