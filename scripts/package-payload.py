"""Package a standalone Next build and ARM runtime without personal configuration."""
from pathlib import Path
import json,re,zipfile,shutil,argparse,hashlib
root=Path(__file__).resolve().parent.parent
app=root/'app';runtime=root/'.tools/runtime';assets=root/'.build/assets'
assets.mkdir(parents=True,exist_ok=True)
parser=argparse.ArgumentParser()
parser.add_argument('--local-data',type=Path,required=True,help='Verified public recommendation snapshot ZIP')
args=parser.parse_args()
manifest=json.loads((root/'local-data-manifest.json').read_text('utf8'))
if hashlib.sha256(args.local_data.read_bytes()).hexdigest()!=manifest['sha256']:raise ValueError('Local dataset checksum mismatch')
shutil.copy2(args.local_data,assets/'local-data.zip')
defaults=json.loads((root/'android/defaults.json').read_text('utf8'))
if any(k not in {'DEFAULT_SOURCES','SEARCH_MAX_PAGES','SEARCH_SOURCE_TIMEOUT_MS'} for k in defaults): raise ValueError('Unexpected/default credential key')
(assets/'defaults.json').write_text(json.dumps(defaults,ensure_ascii=False),'utf8')
needed={'bin/node','etc/tls/cert.pem'};todo=['bin/node']
while todo:
    rel=todo.pop()
    for raw in re.findall(rb'lib[A-Za-z0-9_+.-]+\.so(?:\.[0-9.]+)?\x00',(runtime/rel).read_bytes()):
        dep='lib/'+raw[:-1].decode()
        if (runtime/dep).is_file() and dep not in needed:needed.add(dep);todo.append(dep)
def add_dir(z,base,prefix):
    for p in base.rglob('*'):
        if not p.is_file(): continue
        rel=p.relative_to(base);parts=rel.parts
        if 'cache' in parts or p.name.startswith('.env') or 'private' in p.name.lower(): continue
        if any(x.startswith('swc-') for x in parts) or '@img' in parts or 'sharp' in parts: continue
        if p.suffix in {'.dll','.node','.exe','.log','.tsbuildinfo'}: continue
        z.write(p,prefix+'/'+rel.as_posix())
if not (app/'.next/standalone/server.js').is_file():raise SystemExit('Run DOCKER_BUILD=1 npm run build in app first')
with zipfile.ZipFile(assets/'payload.zip','w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    add_dir(z,app/'.next/standalone','app')
    add_dir(z,app/'.next/static','app/.next/static')
    add_dir(z,app/'public','app/public')
    add_dir(z,root/'licenses','licenses')
    for rel in sorted(needed):z.write(runtime/rel,'runtime/'+rel)
    z.write(root/'android/start.cjs','start.cjs')
    z.write(root/'runtime-provenance.json','runtime-provenance.json')
    z.write(root/'THIRD_PARTY_NOTICES.md','THIRD_PARTY_NOTICES.md')
    z.writestr('edition.json',json.dumps({'localOnly':True,'snapshot':manifest['snapshot']}))
print('Created .build/assets/payload.zip, %.2f MiB'%((assets/'payload.zip').stat().st_size/1048576))
