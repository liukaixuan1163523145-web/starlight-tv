"""Download the public dataset named by the checked-in manifest and verify SHA256."""
from pathlib import Path
import hashlib,json,urllib.request
root=Path(__file__).resolve().parents[1]
m=json.loads((root/'local-data-manifest.json').read_text(encoding='utf8'))
target=root/'.build'/m['file'];target.parent.mkdir(parents=True,exist_ok=True)
if target.exists() and hashlib.sha256(target.read_bytes()).hexdigest()==m['sha256']:
    print('Verified existing dataset:',target)
else:
    temp=target.with_suffix('.download')
    h=hashlib.sha256()
    with urllib.request.urlopen(m['download'],timeout=120) as response,temp.open('wb') as out:
        while chunk:=response.read(1024*1024):out.write(chunk);h.update(chunk)
    if h.hexdigest()!=m['sha256']:raise SystemExit('Dataset checksum mismatch; download was not accepted')
    temp.replace(target);print('Downloaded and verified:',target)
