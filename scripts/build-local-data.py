"""Validate public-field-only local cache exports and create a reproducible seed ZIP."""
from pathlib import Path
import argparse,base64,hashlib,json,re,zipfile

parser=argparse.ArgumentParser()
parser.add_argument('--input',type=Path,required=True)
parser.add_argument('--output',type=Path,required=True)
args=parser.parse_args()
root=Path(__file__).resolve().parents[1]
source=args.input.resolve()
files=[]
douban_fields={'id','title','cover','rating','isTv'}
mdb_fields={'id','title','titleEn','year','cover','isTv','tomatoes','popcorn','criticVotes','ratingUrl'}
def feed(data,allowed):
    assert set(data)=={'items','fetchedAt'} and isinstance(data['fetchedAt'],(int,float))
    assert isinstance(data['items'],list)
    for item in data['items']:
        assert set(item)<=allowed and isinstance(item.get('title'),str)
        for field in ['cover','ratingUrl']:
            url=item.get(field) or ''
            assert not re.search(r'(?:apikey|api_key|token|password)=',url,re.I)
for p in sorted(source.rglob('*.json')):
    rel=p.relative_to(source).as_posix();data=json.loads(p.read_text(encoding='utf8'))
    if re.fullmatch(r'mdblist-cache/(movie|show)\.json',rel):feed(data,mdb_fields)
    elif re.fullmatch(r'recommendation-cache/douban/[a-f0-9]{64}\.json',rel):feed(data,douban_fields)
    elif rel=='recommendation-cache/local-catalog.json':
        for key,f in data.items():assert re.fullmatch(r'(movie|tv):[^:]{1,20}',key);feed(f,douban_fields)
    elif re.fullmatch(r'recommendation-cache/posters/[a-f0-9]{64}\.json',rel):
        assert set(data)=={'type','body'} and re.fullmatch(r'image/(jpeg|png|webp|gif|avif)',data['type'])
        assert len(base64.b64decode(data['body'],validate=True))<=2097152
    elif rel=='snapshot-info.json':
        assert set(data)<={'schema','edition','exportedAt','doubanItems','doubanPages','mdblistMovies','mdblistShows','posters','posterCandidates','feeds','fields'}
    else:raise ValueError('Unexpected file: '+rel)
    files.append((rel,json.dumps(data,ensure_ascii=False,separators=(',',':')).encode()))
required={'mdblist-cache/movie.json','mdblist-cache/show.json','recommendation-cache/local-catalog.json','snapshot-info.json'}
assert required<=set(n for n,_ in files)
args.output.parent.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(args.output,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for rel,data in files:
        info=zipfile.ZipInfo(rel,date_time=(2026,10,18,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED
        z.writestr(info,data)
snapshot=json.loads((source/'snapshot-info.json').read_text(encoding='utf8'))
manifest={'file':args.output.name,'sha256':hashlib.sha256(args.output.read_bytes()).hexdigest(),'bytes':args.output.stat().st_size,'entries':len(files),'snapshot':snapshot,'download':'https://github.com/liukaixuan1163523145-web/starlight-tv/releases/download/v1.1.2-local/'+args.output.name}
(root/'local-data-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps({'bytes':manifest['bytes'],'entries':len(files),'sha256':manifest['sha256']}))
