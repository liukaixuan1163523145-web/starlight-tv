// Physical TV debug build only. Forward its WebView CDP port and reverse 18087
// with ADB first. The release build has WebView debugging disabled.
const fs=require('fs'),path=require('path'),assert=require('assert');
const out=path.resolve(__dirname,'../.build/tv-tests');fs.mkdirSync(out,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 let target;for(let n=0;n<40&&!target;n++){const pages=await (await fetch('http://127.0.0.1:19222/json')).json();target=pages.find(p=>p.type==='page');if(!target)await sleep(500);}assert(target);
 const ws=new WebSocket(target.webSocketDebuggerUrl),pending=new Map();let serial=0;const errors=[];
 await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);};
 const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const wait=async (expression,ms=20000)=>{const deadline=Date.now()+ms;while(Date.now()<deadline){if(await evaluate(expression))return;await sleep(500);}throw Error('Timed out: '+expression);};
 await call('Runtime.enable');await call('Page.enable');
 const original=await evaluate('location.href');
 try{
 if(process.argv.includes('--inspect')){console.log(JSON.stringify(await evaluate(`({url:location.href,title:document.title,agent:navigator.userAgent,text:document.body&&document.body.innerText.slice(0,1600)})`)));return;}
 if(process.argv.includes('--poster')){
  await wait("typeof window.__tvRemote==='function'&&!!document.querySelector('#nav button')",45000);
  await evaluate(`Array.prototype.filter.call(document.querySelectorAll('#nav button'),function(b){return b.textContent==='电影';})[0].click()`);
  await wait("Array.prototype.some.call(document.querySelectorAll('.card'),function(b){return b.textContent.indexOf('潜伏6')>=0;})");
  await evaluate("Array.prototype.filter.call(document.querySelectorAll('.card'),function(b){return b.textContent.indexOf('潜伏6')>=0;})[0].click()");
  await wait("document.querySelector('h1').textContent.indexOf('搜索：')===0&&!!document.querySelector('.card')",45000);
  await wait("document.querySelector('.card img')&&document.querySelector('.card img').naturalWidth>0",45000);
  const search=await evaluate("({width:document.querySelector('.card img').naturalWidth,url:document.querySelector('.card img').src})");
  await evaluate("document.querySelector('.card').click()");await wait("!!document.querySelector('.detail img')",30000);
  await wait("document.querySelector('.detail img').naturalWidth>0",45000);
  const detail=await evaluate("({width:document.querySelector('.detail img').naturalWidth,url:document.querySelector('.detail img').src})");
  const cache=await evaluate("fetch(document.querySelector('.detail img').src,{credentials:'same-origin',cache:'no-store'}).then(function(r){return {status:r.status,cache:r.headers.get('X-TV-Cache')};})");
  assert.equal(cache.status,200);assert.equal(cache.cache,'HIT');
  const report={passed:true,title:'潜伏6',search,detail,cache,agent:await evaluate('navigator.userAgent')};fs.writeFileSync(path.join(out,'device-poster.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));return;
 }
 if(process.argv.includes('--public')){
  await evaluate(`Array.prototype.filter.call(document.querySelectorAll('#nav button'),function(b){return b.textContent==='搜索';})[0].click();document.querySelector('.search input').value='请回答1988';document.querySelector('.search button').click()`);
  await wait("!!document.querySelector('.card')",45000);
  await evaluate("document.querySelector('.card').click()");await wait("!!document.querySelector('.episodes button')",30000);
  const count=await evaluate("document.querySelectorAll('.source-row button').length");
  await sleep(10000);await evaluate("document.querySelector('.episodes button').click()");
  await wait("document.querySelector('video').videoWidth>0&&document.querySelector('video').currentTime>5&&!document.querySelector('video').paused",45000);
  const before=await evaluate("({time:document.querySelector('video').currentTime,title:document.getElementById('play-title').textContent,width:document.querySelector('video').videoWidth})");
  await evaluate("document.querySelector('video').dispatchEvent(new Event('error'))");
  await wait("document.getElementById('play-title').textContent!=="+JSON.stringify(before.title)+"&&document.querySelector('video').currentTime>"+(before.time+2)+"&&!document.querySelector('video').paused",60000);
  const after=await evaluate("({time:document.querySelector('video').currentTime,title:document.getElementById('play-title').textContent,width:document.querySelector('video').videoWidth})");
  const report={passed:true,method:'Injected native video error while real public source was playing on TV',sourceCount:count,before,after};fs.writeFileSync(path.join(out,'device-public.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));return;
 }
 await call('Page.navigate',{url:'http://127.0.0.1:18087/tv/tv.html'});await wait("typeof window.__tvRemote==='function'&&!!document.querySelector('.card')");
 await evaluate(`(function(){var entries={};for(var i=0;i<7;i++)for(var ep=0;ep<3;ep++)entries['vod:tv-'+i+':'+i+':'+ep]={ok:i!==6,at:Date.now(),mbps:20-i,connectMs:100,variation:0,declaredHeight:1080};localStorage.setItem('tv-source-quality-v2',JSON.stringify(entries));})()`);
 await call('Page.reload');await wait("!!document.querySelector('.card')");
 await evaluate(`Array.prototype.filter.call(document.querySelectorAll('#nav button'),function(b){return b.textContent==='豆瓣推荐';})[0].click()`);
 await wait("!!document.querySelector('.card')");await evaluate("document.querySelector('.card').click()");await wait("document.querySelectorAll('.episodes button').length===3");
 const order=await evaluate("Array.prototype.map.call(document.querySelectorAll('.source-row button'),function(b){return {index:+b.dataset.sourceIndex,row:+b.dataset.row,col:+b.dataset.col,text:b.textContent};})");
 assert.equal(order.length,7);assert(order[0].text.includes('Fixture 1'));order.forEach((b,i)=>{assert.equal(b.row,1+Math.floor(i/5));assert.equal(b.col,i%5);});
 await evaluate("document.querySelector('.source-row button').focus();window.__tvRemote('right',false);window.__tvRemote('enter',false)");await wait("!!document.querySelector('.episodes button')");
 assert((await evaluate("document.querySelector('.source-row .primary').textContent")).includes('Fixture 2'));
 await evaluate("document.querySelectorAll('.episodes button')[1].click()");await wait("document.querySelector('video').currentTime>.4&&document.querySelector('video').videoWidth>0",30000);
 await evaluate("window.__tvRemote('down',false);document.querySelector('[data-control-row=\"1\"] [data-value=\"1.5\"]').click();window.__tvRemote('back',false);document.querySelector('video').currentTime=17");
 await wait("document.querySelector('video').currentTime>17.3");
 const before=await evaluate("(function(){var v=document.querySelector('video'),p={time:v.currentTime,rate:v.playbackRate,title:document.getElementById('play-title').textContent};v.dispatchEvent(new Event('error'));return p;})()");
 await wait("document.getElementById('play-title').textContent.indexOf('Fixture 1')>=0&&document.querySelector('video').currentTime>17.5",30000);
 await wait("!document.querySelector('video').paused&&document.querySelector('video').currentTime>"+(before.time+2),20000);
 const after=await evaluate("({time:document.querySelector('video').currentTime,rate:document.querySelector('video').playbackRate,width:document.querySelector('video').videoWidth,title:document.getElementById('play-title').textContent})");
 assert(after.title.includes('第 2 集'));assert(after.time>=before.time-1&&after.time<before.time+10);assert.equal(after.rate,1.5);
 await evaluate("window.__tvRemote('enter',false)");const title=after.title;await sleep(13000);assert.equal(await evaluate("document.getElementById('play-title').textContent"),title);assert(await evaluate("document.querySelector('video').paused"));
 await evaluate("window.__tvRemote('back',false)");await wait("document.querySelector('#player').hidden");
 await sleep(400);await evaluate("window.__tvRemote('back',false)");await wait("!!document.querySelector('.card')");
 const report={passed:true,agent:await evaluate('navigator.userAgent'),before,after,errors,checks:['Chrome 66 actual TV','7 matched sources','source ranking and remote coordinates','manual source identity','real HLS decoded on TV','native error automatically selects backup','same episode and progress','1.5x restored','pause does not switch','back returns to recommendations']};assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'device.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{if(!process.argv.includes('--inspect')&&!process.argv.includes('--public')&&!process.argv.includes('--poster'))await call('Page.navigate',{url:original});ws.close();}
})().catch(e=>{console.error(e);process.exit(1);});
