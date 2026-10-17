import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fetchDoubanFeed } from './douban';
import { extendMDBFeed, getMDBQuota } from './mdblist';
import { recommendationRoot } from './recommendation-cache';
import { getPoster } from './poster-cache';

const feeds: ['movie' | 'tv', string][] = [['movie','豆瓣高分'],['movie','经典'],['movie','热门'],['tv','热门'],['tv','国产剧'],['tv','港剧'],['tv','韩剧'],['tv','美剧'],['tv','日本动画'],['tv','综艺']];
type State = { next: number; pages: number[]; done: boolean[]; lastIds: string[]; posters: string[]; seen: string[]; posterCount: number; mdbDone: boolean[]; mdbRetry: number[]; error: string; updatedAt: number; cycleStartedAt?: number };
let state: State | undefined, busy: Promise<unknown> | undefined, paused = false;
let statsCache: { at: number; value: object } | undefined;
const stateFile = () => path.join(recommendationRoot(), 'library-progress.json');
async function load() {
  if (state) return state;
  try { state = JSON.parse(await fs.readFile(stateFile(), 'utf8')); } catch { /* initial expansion */ }
  if (!state || !Array.isArray(state.pages)) state = { next: 0, pages: feeds.map(()=>0), done: feeds.map(()=>false), lastIds: feeds.map(()=>''), posters: [], seen: [], posterCount: 0, mdbDone: [false,false], mdbRetry: [0,0], error:'', updatedAt:0 };
  return state;
}
async function save() { if (!state) return; state.updatedAt=Date.now();await fs.mkdir(recommendationRoot(),{recursive:true});await fs.writeFile(stateFile()+'.tmp',JSON.stringify(state),{mode:0o600});await fs.rename(stateFile()+'.tmp',stateFile());statsCache=undefined; }
function addPosters(s: State, items: { cover?: string }[]) { const seen=new Set(s.seen);for(const item of items){if(item.cover && !seen.has(item.cover) && seen.size<8000){seen.add(item.cover);s.posters.push(item.cover);}}s.seen=[...seen]; }
export function pauseCacheWarm(value: boolean) { paused=value; }
export async function cacheStats() {
  if(statsCache && Date.now()-statsCache.at<15000)return statsCache.value;
  const s=await load(),ids=new Set<string>();let pages=0,posters=0,bytes=0;
  try { for(const name of await fs.readdir(path.join(recommendationRoot(),'douban'))){if(!name.endsWith('.json'))continue;const d=JSON.parse(await fs.readFile(path.join(recommendationRoot(),'douban',name),'utf8'));pages++;for(const item of d.items||[])ids.add(String(item.id));} } catch { /* first run */ }
  try { for(const name of await fs.readdir(path.join(recommendationRoot(),'posters'))){if(!name.endsWith('.json'))continue;const stat=await fs.stat(path.join(recommendationRoot(),'posters',name));bytes+=stat.size;posters++;} } catch { /* first run */ }
  const mdb: number[]=[];for(const type of ['movie','show']){try{const data=JSON.parse(await fs.readFile(path.join(process.env.MDBLIST_CACHE_DIR||'.mdblist-cache',type+'.json'),'utf8'));mdb.push(data.items.length);}catch{mdb.push(0);}}
  const value={doubanItems:ids.size,doubanPages:pages,mdblistMovies:mdb[0],mdblistShows:mdb[1],posters,posterMiB:Math.round(bytes/1048576),pendingPosters:s.posters.length,finishedDouban:s.done.every(Boolean),finishedMDB:s.mdbDone.every(Boolean),paused,busy:!!busy,error:s.error,limits:{doubanPages:600,posterMiB:512,posters:8000,mdbEach:3000},quota:getMDBQuota(),updatedAt:s.updatedAt};
  statsCache={at:Date.now(),value};return value;
}
export async function warmCacheStep(postersOnly=false) {
  if(busy)return {busy:true};if(paused)return {paused:true};
  busy=(async()=>{
    const s=await load();s.error='';
    if(!s.cycleStartedAt)s.cycleStartedAt=Date.now();
    if(Date.now()-s.cycleStartedAt>604800000){s.pages=feeds.map(()=>0);s.done=feeds.map(()=>false);s.lastIds=feeds.map(()=>'');s.mdbDone=[false,false];s.mdbRetry=[0,0];s.cycleStartedAt=Date.now();}
    if(s.done.every(Boolean)&&s.mdbDone.every(Boolean)&&!s.posters.length)return {done:true,pendingPosters:0};
    if(!postersOnly){
      for(let pick=0;pick<12;pick++){
        const i=s.next++%12;
        if(i<10){if(s.done[i])continue;
          try {const [type,tag]=feeds[i];const feed=await fetchDoubanFeed(type,tag,s.pages[i]*30,30);const ids=feed.items.map(x=>x.id).join(',');addPosters(s,feed.items);s.pages[i]++;s.done[i]=feed.items.length<30||ids===s.lastIds[i]||s.pages[i]>=30;s.lastIds[i]=ids;}catch{s.error='部分豆瓣片单暂时无法更新，已保留现有缓存';}break;
        } else {const j=i-10;if(s.mdbDone[j]||Date.now()<s.mdbRetry[j])continue;
          try {const result=await extendMDBFeed(j===0?'movie':'show');s.mdbDone[j]=result.done;if(result.feed)addPosters(s,result.feed.items);}catch(e){s.mdbRetry[j]=Date.now()+3600000;s.error=e instanceof Error?e.message:'MDBList 暂时无法扩充，已保留现有缓存';}break;
        }
      }
    }
    if(!paused){const batch=s.posters.splice(0,postersOnly?12:4);let next=0;await Promise.all([0,1].map(async()=>{while(next<batch.length&&!paused){const cover=batch[next++];try{await getPoster(cover);s.posterCount++;}catch{/* inaccessible images are retried naturally when displayed */}}}));if(next<batch.length)s.posters.unshift(...batch.slice(next));}
    await save();return {ok:true,pendingPosters:s.posters.length,error:s.error};
  })().finally(()=>{busy=undefined;});return busy;
}
