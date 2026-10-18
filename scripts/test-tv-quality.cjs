// Local-only TV fixture and end-to-end checks: real generated HLS, mocked catalogs.
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert');
const root=path.resolve(__dirname,'..'),media=path.join(root,'.build-mobile/test-media');
const out=path.join(root,'.build/tv-tests');fs.mkdirSync(out,{recursive:true});
const records=Array.from({length:7},(_,i)=>({name:'Test Film'+(i===0?'国语版':'英语版'),year:'2025',typeName:'电影',area:'美国',language:i===0?'国语':'英语',pic:'',sourceKey:'tv-'+i,sourceName:'Fixture '+i,vodId:String(i)}));
const counters={search:0,details:[],media:0};
function send(res,data,type='application/json'){res.writeHead(200,{'Content-Type':type,'Access-Control-Allow-Origin':'*'});res.end(type==='application/json'?JSON.stringify(data):data);}
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost'),base='http://127.0.0.1:'+server.address().port;
 if(u.pathname==='/api/status')return send(res,{verified:true,localOnly:true,defaultSources:records.map((r,i)=>({name:r.sourceName,url:'https://fixture.invalid/'+i}))});
 if(u.pathname==='/api/douban'||u.pathname==='/api/mdblist')return send(res,{items:[{title:'Test Film',year:'2025',rating:8.5,isTv:false,cover:''}],localOnly:true});
 if(u.pathname==='/api/search'){counters.search++;return send(res,{list:records});}
 if(u.pathname==='/api/detail'){counters.details.push(u.searchParams.get('id'));return send(res,{videoInfo:{title:'Test Film',year:'2025',typeName:'电影',cover:'',desc:'Local test video',language:'英语',area:'美国'},episodes:Array(3).fill(base+'/fixture.m3u8')});}
 if(u.pathname==='/api/tv-cache')return send(res,{localOnly:true,doubanItems:3967,mdblistMovies:2901,mdblistShows:1622,posters:6574});
 if(u.pathname==='/fixture.m3u8'||u.pathname==='/api/proxy'||u.pathname==='/api/live/stream'){counters.media++;const name=path.basename(u.searchParams.get('url')||'');if(/^segment-\d+\.ts$/.test(name))return send(res,fs.readFileSync(path.join(media,name)),'video/mp2t');return send(res,fs.readFileSync(path.join(media,'fixture.m3u8'),'utf8').replace(/^(segment-.*\.ts)$/gm,base+'/test-media/$1'),'application/vnd.apple.mpegurl');}
 if(u.pathname==='/api/poster'){res.writeHead(404);return res.end();}
 const dir=u.pathname.startsWith('/test-media/')?media:path.join(root,'app/public'),rel=u.pathname.startsWith('/test-media/')?u.pathname.slice(12):u.pathname.slice(1),file=path.resolve(dir,rel);
 if(!file.startsWith(dir+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end();}
 send(res,fs.readFileSync(file),{'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.ts':'video/mp2t'}[path.extname(file)]||'application/octet-stream');
});
(async()=>{
 await new Promise(r=>server.listen(process.argv.includes('--serve')?18087:0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 if(process.argv.includes('--serve')){console.log(base+'/tv/tv.html');return;}
 const {chromium}=require(process.env.PLAYWRIGHT_MODULE||process.env.USERPROFILE+'/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
 const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message);});page.on('console',m=>console.log('CONSOLE',m.text()));
 await page.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
 await page.addInitScript(()=>{var entries={};for(var i=0;i<7;i++)for(var ep=0;ep<3;ep++)entries['vod:tv-'+i+':'+i+':'+ep]={ok:i!==6,at:Date.now(),mbps:i===0?40:20-i,connectMs:100,variation:0,declaredHeight:1080};localStorage.setItem('tv-source-quality-v2',JSON.stringify(entries));});
 await page.goto(base+'/tv/tv.html');await page.getByRole('button',{name:'豆瓣推荐',exact:true}).click();await page.locator('.card').first().click();try{await page.waitForSelector('.episodes button',{timeout:8000});}catch(e){console.log(await page.locator('body').innerText());throw e;}
 assert.equal(await page.locator('.source-row button').count(),7,'Recommendation expands all matched language/source records');
 await page.screenshot({path:path.join(out,'sources.png')});
 const rects=await page.locator('.source-row button').evaluateAll(bs=>bs.map(b=>({y:b.getBoundingClientRect().top,x:b.getBoundingClientRect().left})));assert.equal(rects[0].y,rects[4].y);assert(rects[5].y>rects[4].y,'Visual rows must match five-column remote coordinates');
 let order=await page.locator('.source-row button').evaluateAll(bs=>bs.map(b=>({index:+b.dataset.sourceIndex,row:+b.dataset.row,col:+b.dataset.col,text:b.textContent})));
 assert(order[0].text.includes('Fixture 1'),'Fluent original ranks above faster dub');assert(order.at(-1).text.includes('Fixture 6'),'Failed source ranks last');
 order.forEach((b,i)=>{assert.equal(b.row,1+Math.floor(i/5));assert.equal(b.col,i%5);});
 await page.locator('.source-row button').first().focus();await page.keyboard.press('ArrowRight');assert.equal(await page.evaluate(()=>document.activeElement.dataset.sourceIndex),String(order[1].index));
 await page.keyboard.press('Enter');await page.waitForSelector('.episodes button');assert((await page.locator('.source-row .primary').textContent()).includes('Fixture 2'),'Remote confirmation selects exact focused source');
 await page.locator('.episodes button').nth(1).click();await page.waitForFunction(()=>document.querySelector('video').currentTime>.3&&document.querySelector('video').videoWidth>0);
 assert((await page.locator('#play-title').textContent()).includes('Fixture 2'),'Manual source kept');
 await page.keyboard.press('ArrowDown');await page.getByRole('button',{name:'1.5 倍',exact:true}).click();await page.keyboard.press('Escape');await page.evaluate(()=>{document.querySelector('video').currentTime=17;});
 await page.waitForFunction(()=>document.querySelector('video').currentTime>17.3);
 const before=await page.evaluate(()=>{var v=document.querySelector('video'),s={time:v.currentTime,rate:v.playbackRate,title:document.getElementById('play-title').textContent};v.dispatchEvent(new Event('error'));return s;});
 await page.waitForFunction(()=>document.getElementById('play-title').textContent.includes('Fixture 1')&&document.querySelector('video').currentTime>17.5,{timeout:20000});
 const after=await page.evaluate(()=>{var v=document.querySelector('video');return {time:v.currentTime,rate:v.playbackRate,width:v.videoWidth,title:document.getElementById('play-title').textContent};});
 assert(after.title.includes('第 2 集'));assert(after.time>=before.time-1&&after.time<before.time+8);assert.equal(after.rate,1.5);
 await page.screenshot({path:path.join(out,'recovered.png')});
 await page.keyboard.press('Enter');assert(await page.locator('video').evaluate(v=>v.paused));
 const pausedTitle=await page.locator('#play-title').textContent();await page.waitForTimeout(13000);assert.equal(await page.locator('#play-title').textContent(),pausedTitle,'Pause does not fail over');
 await page.keyboard.press('Enter');await page.waitForFunction(()=>!document.querySelector('video').paused);
 await page.keyboard.press('Escape');await page.waitForFunction(()=>document.querySelector('#player').hidden);
 await page.waitForTimeout(400);assert(await page.locator('#player').isHidden(),'Back cancels recovery');
 await page.getByRole('button',{name:'直播',exact:true}).click();assert((await page.locator('.live-card').count())>0);await page.locator('.live-card').first().click();await page.waitForFunction(()=>document.querySelector('video').videoWidth>0&&!document.querySelector('video').paused);
 await page.keyboard.press('ArrowDown');await page.waitForTimeout(700);await page.keyboard.press('Escape');await page.waitForFunction(()=>document.querySelector('#player').hidden);assert(await page.locator('.live-card').count()>0);
 assert.deepEqual(errors,[]);const report={passed:true,environment:'Desktop Chromium with local HLS; not physical TV',before,after,checks:['recommendation multiple versions','quality/original-language order','known failed last','remote focus coordinates after sorting','remote selection identity','manual source retained','same episode after native error','position and rate restored','real HLS decoded','pause does not switch','back returns to list','live channel/back regression'],counters};fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
