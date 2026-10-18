import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
vi.mock('./fetch-utils', () => ({ fetchUpstream: vi.fn() }));
import { fetchUpstream } from './fetch-utils';
import { getPoster } from './poster-cache';
let dir: string;
beforeEach(async () => {dir=await fs.mkdtemp(path.join(tmpdir(),'starlight-poster-'));vi.stubEnv('RECOMMEND_CACHE_DIR',dir);vi.stubEnv('RECOMMEND_LOCAL_ONLY','1');vi.mocked(fetchUpstream).mockReset();});
afterEach(async () => {vi.unstubAllEnvs();await fs.rm(dir,{recursive:true,force:true});});
describe('offline recommendations and on-demand source artwork',()=>{
 it('keeps missing recommendation posters offline',async()=>{await expect(getPoster('https://example.com/offline.jpg')).rejects.toThrow('local snapshot');expect(fetchUpstream).not.toHaveBeenCalled();});
 it('downloads source artwork once and reuses the disk cache',async()=>{vi.mocked(fetchUpstream).mockResolvedValue(new Response(new Uint8Array([1,2,3]),{headers:{'content-type':'image/jpeg'}}));const url='https://example.com/source.jpg';expect((await getPoster(url,true)).cached).toBe(false);expect((await getPoster(url,true)).cached).toBe(true);expect(fetchUpstream).toHaveBeenCalledTimes(1);expect(await fs.readdir(path.join(dir,'source-posters'))).toHaveLength(1);});
 it('reuses bundled artwork before fetching a source image',async()=>{const url='https://example.com/bundled.jpg';await fs.mkdir(path.join(dir,'posters'));await fs.writeFile(path.join(dir,'posters',createHash('sha256').update(url).digest('hex')+'.json'),JSON.stringify({type:'image/jpeg',body:'AQID'}));expect((await getPoster(url,true)).cached).toBe(true);expect(fetchUpstream).not.toHaveBeenCalled();});
 it('rejects an HTML error page without caching it as an image',async()=>{vi.mocked(fetchUpstream).mockResolvedValue(new Response('<html>blocked</html>',{headers:{'content-type':'text/html'}}));await expect(getPoster('https://example.com/error.jpg',true)).rejects.toThrow('unavailable');await expect(fs.readdir(path.join(dir,'source-posters'))).rejects.toThrow();});
});
