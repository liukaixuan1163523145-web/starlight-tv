"""Bounded read-only source audit. Treat transport checks separately from decoded playback."""
import concurrent.futures,datetime,ipaddress,json,re,socket,time,urllib.request,urllib.parse,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT.parents[1]/'outputs/mobile/source-audit-20261018.json'
current=json.loads(json.loads((ROOT/'android/defaults.json').read_text('utf8'))['DEFAULT_SOURCES'])
extra=[('非凡资源','https://cj.ffzyapi.com/api.php/provide/vod'),('无尽资源','https://api.wujinapi.me/api.php/provide/vod'),('优酷资源（第三方）','https://api.ukuapi88.com/api.php/provide/vod'),('如意资源','https://cj.rycjapi.com/api.php/provide/vod'),('电影天堂','https://caiji.dyttzyapi.com/api.php/provide/vod')]
sources=current+[dict(name=n,url=u,isAdult=False) for n,u in extra]
if '--extra' in sys.argv:
 extra=[('黑木耳','https://json.heimuer.xyz/api.php/provide/vod'),('天涯资源','https://tyyszy.com/api.php/provide/vod'),('茅台资源','https://caiji.maotaizy.cc/api.php/provide/vod'),('卧龙资源','https://wolongzyw.com/api.php/provide/vod'),('豆瓣资源（第三方）','https://dbzy.tv/api.php/provide/vod'),('iKun资源','https://ikunzyapi.com/api.php/provide/vod')]
 sources=[dict(name=n,url=u,isAdult=False) for n,u in extra]
 OUT=OUT.with_name('source-audit-extra-20261018.json')
dns_verified=set()
def public(url):
 p=urllib.parse.urlparse(url)
 if p.scheme not in ('http','https') or not p.hostname or p.username or p.password:raise ValueError('invalid URL')
 addresses=socket.getaddrinfo(p.hostname,p.port or (443 if p.scheme=='https' else 80),type=socket.SOCK_STREAM)
 if not addresses:raise ValueError('no DNS address')
 ips=[ipaddress.ip_address(a[4][0]) for a in addresses]
 if all(i.is_global for i in ips):return
 # This development PC uses a VPN fake-IP DNS (198.18/15). Confirm the public
 # hostname independently via DoH; never allow arbitrary private destinations.
 if all(i.version==4 and i in ipaddress.ip_network('198.18.0.0/15') for i in ips):
  if p.hostname in dns_verified:return
  req=urllib.request.Request('https://dns.google/resolve?'+urllib.parse.urlencode({'name':p.hostname,'type':'A'}))
  with urllib.request.urlopen(req,timeout=8) as r:answer=json.loads(r.read(65536))
  real=[ipaddress.ip_address(a['data']) for a in answer.get('Answer',[]) if a.get('type')==1]
  if real and all(i.is_global for i in real):dns_verified.add(p.hostname);return
 raise ValueError('non-public address')
class SafeRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,req,fp,code,msg,headers,newurl):
  public(newurl);return super().redirect_request(req,fp,code,msg,headers,newurl)
opener=urllib.request.build_opener(SafeRedirect())
def fetch(url,limit=2*1024*1024,media=False):
 public(url);url=urllib.parse.quote(url,safe=':/?&=%#+@;,$!~*()');t=time.monotonic();headers={'User-Agent':'Mozilla/5.0','Accept':'*/*'}
 if media:headers['Range']='bytes=0-'+str(limit-1)
 with opener.open(urllib.request.Request(url,headers=headers),timeout=6) as r:
  connected=time.monotonic();data=r.read(limit);elapsed=time.monotonic()-t
  return data,r.url,dict(ms=round(elapsed*1000),connectMs=round((connected-t)*1000),bytes=len(data),mbps=round(len(data)*8/max(elapsed,.001)/1e6,2))
def norm(s):return re.sub(r'[\s·：:！!（）()\-]','',s).lower()
def media_probe(url):
 height=0
 for _ in range(4):
  data,url,_=fetch(url,256*1024);text=data.decode('utf-8-sig')
  if not text.startswith('#EXTM3U'):raise ValueError('not HLS')
  lines=[x.strip() for x in text.splitlines()];streams=[]
  for i,l in enumerate(lines[:-1]):
   if l.startswith('#EXT-X-STREAM-INF:'):
    h=re.search(r'RESOLUTION=\d+x(\d+)',l);h=int(h[1]) if h else 0
    u=next((x for x in lines[i+1:] if x and not x.startswith('#')),None)
    if u:streams.append((h,u))
  if streams:
   suitable=[x for x in streams if x[0]<=1080] or streams; height,u=max(suitable);url=urllib.parse.urljoin(url,u);continue
  key=next((l for l in lines if l.startswith('#EXT-X-KEY:') and 'METHOD=NONE' not in l),None)
  if key:
   m=re.search(r'URI="([^"]+)"',key)
   if 'METHOD=AES-128' not in key or not m:raise ValueError('unsupported encryption')
   k,_,_=fetch(urllib.parse.urljoin(url,m[1]),64)
   if len(k)!=16:raise ValueError('unavailable AES key')
  segments=[l for l in lines if l and not l.startswith('#')]
  if not segments:raise ValueError('no segments')
  indices=sorted(set([0,min(10,len(segments)//2)]));samples=[]
  for i in indices:
   b,u,metric=fetch(urllib.parse.urljoin(url,segments[i]),192*1024,True)
   if len(b)<16384 or b.lstrip().startswith((b'<',b'{')):raise ValueError('invalid segment response')
   metric['index']=i;metric['host']=urllib.parse.urlparse(u).hostname;samples.append(metric)
  return dict(ok=True,declaredHeight=height,encrypted=bool(key),samples=samples,slowestMbps=min(s['mbps'] for s in samples),decoded=False)
 raise ValueError('playlist depth exceeded')
def audit(s):
 result={'name':s['name'],'url':s['url'],'new':s not in current,'searches':[]}
 chosen=[]
 for query in ['狂飙','请回答1988','绝命毒师','新闻女王']:
  t=time.monotonic()
  try:
   b,_,m=fetch(s['url'].rstrip('/')+'?'+urllib.parse.urlencode({'ac':'videolist','wd':query,'pg':1}));obj=json.loads(b)
   matches=[v for v in obj.get('list',[]) if (norm(v.get('vod_name',''))==norm(query) or re.fullmatch(re.escape(norm(query))+r'第[一二三四五六七八九十0-9]+季',norm(v.get('vod_name','')))) and not re.search('解说|预告|短剧',v.get('type_name','')+v.get('vod_name',''))]
   result['searches'].append({'query':query,'ok':True,'ms':m['ms'],'matches':len(matches)})
   if len(chosen)<3:
    for v in matches:
     urls=re.findall(r'https?://[^#$\s]+\.m3u8(?:\?[^#$\s]*)?',v.get('vod_play_url',''))
     if urls:chosen.append((v.get('vod_name'),urls[0]));break
  except Exception as e:result['searches'].append({'query':query,'ok':False,'ms':round((time.monotonic()-t)*1000),'error':str(e)[:150]})
  time.sleep(.25)
 result['mediaAttempts']=[]
 for title,url in chosen[:2]:
  try:attempt={**media_probe(url),'sampleTitle':title}
  except Exception as e:attempt={'ok':False,'sampleTitle':title,'error':str(e)[:150]}
  result['mediaAttempts'].append(attempt)
  if attempt['ok']:break
 result['media']=next((x for x in result['mediaAttempts'] if x['ok']),result['mediaAttempts'][-1] if result['mediaAttempts'] else {'ok':False,'error':'no exactly matched HLS sample'})
 result['searchMatched']=sum(bool(x.get('matches')) for x in result['searches']);print(json.dumps({'source':s['name'],'matched':result['searchMatched'],'media':result['media'].get('ok')},ensure_ascii=False),flush=True)
 return result
results=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
 for r in pool.map(audit,sources):results.append(r)
report={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'environment':'development PC network, not phone network','provenance':('https://github.com/samqin123/MoonTV/blob/main/config.json' if '--extra' in sys.argv else 'https://gist.github.com/yifanwang-yet/dbb7af044d90b5f51c1f32d0e0a200f6'),'limitations':['Up to two exactly matched samples per source, four searches; not full-catalogue coverage','HLS transport and key retrieval only; no video decode, subtitle or ad-free verification','Names are third-party labels, not platform affiliation'],'results':results}
OUT.parent.mkdir(parents=True,exist_ok=True);OUT.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8');print(str(OUT),flush=True)
