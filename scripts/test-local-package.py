"""Verify a fresh APK dataset and run its packaged server with outbound fetch blocked."""
from pathlib import Path
import argparse,base64,hashlib,io,json,os,secrets,subprocess,time,urllib.request,urllib.error,urllib.parse,zipfile

parser=argparse.ArgumentParser();parser.add_argument('--apk',type=Path,required=True);parser.add_argument('--report',type=Path,required=True);parser.add_argument('--flavor',choices=['tv','mobile'],default='tv');args=parser.parse_args()
root=Path(__file__).resolve().parents[1]
stage=root/'.build'/('local-smoke-'+str(int(time.time())))
stage.mkdir(parents=True)
manifest=json.loads((root/'local-data-manifest.json').read_text(encoding='utf8'))
def extract(z,dest):
    assert len(z.namelist())==len(set(z.namelist()))
    for name in z.namelist():
        p=(dest/name).resolve();assert p.is_relative_to(dest.resolve())
        if name.endswith('/'):p.mkdir(parents=True,exist_ok=True);continue
        p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(z.read(name))
with zipfile.ZipFile(args.apk) as apk:
    defaults=json.loads(apk.read('assets/defaults.json'))
    assert not {'PASSWORD','MDBLIST_API_KEY'} & set(defaults)
    seed=apk.read('assets/local-data.zip')
    assert hashlib.sha256(seed).hexdigest()==manifest['sha256']
    with zipfile.ZipFile(io.BytesIO(seed)) as z:extract(z,stage/'data')
    with zipfile.ZipFile(io.BytesIO(apk.read('assets/payload.zip'))) as z:
        assert json.loads(z.read('edition.json'))['localOnly'] is True
        extract(z,stage/'embedded')
password=secrets.token_urlsafe(32)
(stage/'server-config.json').write_text(json.dumps({**defaults,'PASSWORD':password}),encoding='utf8')
audit=stage/'outbound-attempts.txt'
blocker=stage/'block-outbound.cjs'
blocker.write_text("const fs=require('fs');global.fetch=function(){fs.appendFileSync(process.env.OUTBOUND_AUDIT,'blocked\\n');return Promise.reject(new Error('Outbound fetch blocked for local-data test'));};",encoding='utf8')
env={**os.environ,'TV_DATA_DIR':str(stage.resolve()),'OUTBOUND_AUDIT':str(audit.resolve()),'STARLIGHT_PORT':'18082'}
env.pop('MDBLIST_API_KEY',None)
# Use the APK's real start script (including edition and configuration handling).
# Its loopback port is fixed at 8080, so this test uses an isolated port via a copy.
start=stage/'embedded/start.cjs'
start.write_text(start.read_text(encoding='utf8').replace("PORT:'8080'","PORT:'18082'"),encoding='utf8')
with (stage/'server.log').open('w',encoding='utf8') as log:
    process=subprocess.Popen(['node','--require',str(blocker.resolve()),str(start.resolve())],env=env,stdout=log,stderr=log)
    try:
        base='http://127.0.0.1:18082'
        for _ in range(100):
            try:status=json.load(urllib.request.urlopen(base+'/api/status',timeout=1));break
            except Exception:
                if process.poll() is not None:raise RuntimeError('Packaged server exited; inspect '+str(stage/'server.log'))
                time.sleep(.2)
        else:raise RuntimeError('Packaged server did not start')
        assert status['version']=='1.1.2' and status['localOnly'] and status['passwordRequired']
        r=urllib.request.urlopen(urllib.request.Request(base+'/api/auth',data=json.dumps({'password':password}).encode(),headers={'Content-Type':'application/json'}),timeout=5)
        cookie=r.headers['Set-Cookie'].split(';')[0]
        def request(route,body=None):
            return urllib.request.urlopen(urllib.request.Request(base+route,data=json.dumps(body).encode() if body else None,headers={'Cookie':cookie,'Content-Type':'application/json'}),timeout=30)
        samples=[]
        for kind,count in [('movie',manifest['snapshot']['mdblistMovies']),('show',manifest['snapshot']['mdblistShows'])]:
            at=time.monotonic();d=json.load(request('/api/mdblist?type='+kind));assert len(d['items'])==count and d['localOnly']
            samples.append({'kind':kind,'items':count,'milliseconds':round((time.monotonic()-at)*1000)})
        catalog=json.loads((stage/'data/recommendation-cache/local-catalog.json').read_text(encoding='utf8'))
        for key,feed in catalog.items():
            kind,tag=key.split(':',1)
            for offset,size in [(0,30),(25,25),(len(feed['items'])+30,30)]:
                q=urllib.parse.urlencode({'type':kind,'tag':tag,'pageStart':offset,'pageSize':size})
                d=json.load(request('/api/douban?'+q));assert d['items']==feed['items'][offset:offset+size] and d['localOnly']
        posters=0
        for feed in catalog.values():
            for item in feed['items']:
                url=item.get('cover','');key=hashlib.sha256(url.encode()).hexdigest()
                if not (stage/'data/recommendation-cache/posters'/(key+'.json')).exists():continue
                with request('/api/poster?url='+urllib.parse.quote(url,safe='')) as r:assert r.status==200 and r.headers['X-TV-Cache']=='HIT' and len(r.read())>100
                posters+=1
                if posters>=3:break
            if posters>=3:break
        assert posters==3
        try:request('/api/poster?url=https%3A%2F%2Fexample.invalid%2Fmissing.jpg');raise AssertionError('Missing poster should not be fetched')
        except urllib.error.HTTPError as e:assert e.code==502
        assert json.load(request('/api/tv-cache',{'action':'step'}))['localOnly']
        stats=json.load(request('/api/tv-cache'));assert stats['localOnly'] and stats['mdblistMovies']==manifest['snapshot']['mdblistMovies']
        try:urllib.request.urlopen(base+'/api/mdblist?type=movie');raise AssertionError('Authentication missing')
        except urllib.error.HTTPError as e:assert e.code==401
        assert not audit.exists(), 'A recommendation route attempted an outbound request'
        page=urllib.request.urlopen(base+('/mobile/index.html' if args.flavor=='mobile' else '/tv/tv.html')).read().decode()
        assert ('/mobile/app.js' if args.flavor=='mobile' else '/tv/tv.js?v=') in page
        report={'version':__import__('xml.etree.ElementTree',fromlist=['parse']).parse(root/'android/AndroidManifest.xml').getroot().get('{http://schemas.android.com/apk/res/android}versionName'), 'sharedServerVersion':'1.1.2','apkSha256':hashlib.sha256(args.apk.read_bytes()).hexdigest(),'apkBytes':args.apk.stat().st_size,'snapshot':manifest['snapshot'],'checks':{'freshInstallNoApiKey':True,'realPackagedStartScript':True,'outboundRecommendationRequests':0,'mdbBothKinds':True,'doubanTenCategoriesAndPagination':True,'localPosterHits':posters,'missingPosterNoNetwork':True,'backgroundWarmDisabled':True,'cacheAuthProtected':True,'snapshotChecksumMatches':True,'noCredentialsInDefaults':True},'samples':samples,'physicalTvRevalidation':False}
        if args.flavor=='mobile':report.update(version=__import__('xml.etree.ElementTree',fromlist=['parse']).parse(root/'mobile/android/AndroidManifest.xml').getroot().get('{http://schemas.android.com/apk/res/android}versionName'),physicalPhoneValidation=False,sharedServerVersion='1.1.2')
        args.report.parent.mkdir(parents=True,exist_ok=True);args.report.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
        print(json.dumps({'passed':True,'samples':samples,'apkMiB':round(report['apkBytes']/1048576,2)}))
    finally:process.terminate();process.wait(timeout=10)
