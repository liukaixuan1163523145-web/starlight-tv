"""Download hash-pinned Termux packages; extract data only, never run scripts."""
from pathlib import Path
import hashlib, io, json, tarfile, urllib.request, argparse

root=Path(__file__).resolve().parent.parent
parser=argparse.ArgumentParser()
parser.add_argument('--arch',choices=['arm','arm64'],default='arm')
args=parser.parse_args()
manifest=root/('runtime-provenance-arm64.json' if args.arch=='arm64' else 'runtime-provenance.json')
dest=root/('.tools/runtime-arm64' if args.arch=='arm64' else '.tools/runtime');cache=root/'.tools/debs'
dest.mkdir(parents=True,exist_ok=True);cache.mkdir(parents=True,exist_ok=True)
aliases=[]
for pkg in json.loads(manifest.read_text('utf8')):
    archive=cache/Path(pkg['url']).name
    if not archive.exists():
        with urllib.request.urlopen(pkg['url'],timeout=60) as response: archive.write_bytes(response.read())
    raw=archive.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=pkg['sha256']: raise ValueError('Hash mismatch: '+pkg['name'])
    if raw[:8]!=b'!<arch>\n': raise ValueError('Not a Debian ar archive')
    pos=8
    while pos+60<=len(raw):
        header=raw[pos:pos+60];name=header[:16].decode().strip().rstrip('/');size=int(header[48:58]);data=raw[pos+60:pos+60+size];pos+=60+size+size%2
        if not name.startswith('data.tar'): continue
        with tarfile.open(fileobj=io.BytesIO(data),mode='r:*') as tar:
            for member in tar:
                rel=member.name.removeprefix('./');prefix='data/data/com.termux/files/usr/'
                if not rel.startswith(prefix): continue
                rel=rel[len(prefix):]
                if not rel.startswith(('bin/node','lib/','etc/tls/','etc/resolv.conf')): continue
                path=(dest/rel).resolve()
                if not path.is_relative_to(dest.resolve()): raise ValueError('Unsafe member')
                if member.isfile(): path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(tar.extractfile(member).read())
                elif member.issym() and rel.startswith('lib/'): aliases.append((rel,member.linkname))
    print('Verified '+pkg['name']+' '+pkg['version'])
for rel,target in aliases:
    alias=dest/rel;source=(alias.parent/target).resolve()
    if source.is_relative_to(dest.resolve()) and source.is_file() and not alias.exists(): alias.write_bytes(source.read_bytes())
print('Runtime ready in '+str(dest))
