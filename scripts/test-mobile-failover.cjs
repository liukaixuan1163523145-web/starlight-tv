const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const code=fs.readFileSync(path.join(__dirname,'../mobile/failover.js'),'utf8');
function fixture(){
 let now=0,fetches=[],activated=[],failures=[],messages=[],timers=[];const events={};
 const records=['A','B','C','D','E'].map((name,i)=>({sourceKey:name,vodId:'1',sourceName:name,score:100-i}));
 const scope={AbortController,Date:{now:()=>now},Math,String,Promise,isFinite,navigator:{onLine:true},document:{hidden:false},
  setTimeout:f=>{timers.push(f);return f;},clearTimeout(){},setInterval(){},group:{name:'Fixture',records},episode:2,playing:true,liveActive:false,
  detail:{record:records[0],sourceIndex:0},hls:{destroy(){}},sources:[],speed:{get:()=>null},qualityScore:r=>r.score,qualityFailure(){failures.push('current');},qualitySave(r){failures.push(r.sourceKey);},save(){},cover:()=>'',
  loading:{start:m=>messages.push(m),stage(){},fail:m=>messages.push(m)},osd:m=>messages.push(m),
  video:{currentTime:137,duration:600,playbackRate:1.5,paused:false,seeking:false,addEventListener:(n,f)=>events[n]=f,pause(){this.paused=true;if(events.pause)events.pause();}},
  fetch:async url=>{fetches.push(url);return {ok:true,json:async()=>({episodes:['a','b','c'],videoInfo:{}})};}
 };
 vm.createContext(scope);vm.runInContext(code,scope);
 scope.play=i=>{activated.push({index:scope.detail.sourceIndex,episode:i});scope.recoveryBegin(i);scope.video.currentTime=0;scope.video.playbackRate=1;scope.video.pause();scope.recoveryArmed();scope.video.paused=false;events.play();};
 scope.recoveryBegin(2);scope.recoveryArmed();scope.recoveryProgress();
 return {s:scope,events,records,fetches,activated,failures,messages,timers,tick:ms=>{now+=ms;scope.recoveryTick();}};
}
const flush=()=>new Promise(r=>setImmediate(r));
(async()=>{
 let f=fixture();await f.s.recoveryFail('fatal');assert.equal(f.activated[0].index,1);assert.equal(f.activated[0].episode,2);assert.equal(f.s.recovery.restore,137);assert(f.s.recoveryRestore());assert.equal(f.s.video.currentTime,137);assert.equal(f.s.video.playbackRate,1.5);f.s.recoveryProgress();assert.equal(f.s.recovery.restore,null);
 await f.s.recoveryFail('again');assert.equal(f.activated[1].index,2,'Next failure never loops to A/B');assert.equal(f.s.recovery.restore,137,'Consecutive failures retain progress');
 f=fixture();f.s.fetch=async url=>{f.fetches.push(url);return {ok:true,json:async()=>({episodes:['only one']})};};await f.s.recoveryFail('fatal');assert.equal(f.fetches.length,3);assert.equal(f.activated.length,0);assert(f.s.recovery.exhausted,'Missing episode is skipped, bounded to three');
 f=fixture();f.s.speed.get=key=>key.includes(':B:')?{ok:false}:null;await f.s.recoveryFail('fatal');assert.equal(f.activated[0].index,2,'Known measurement failure skipped');
 f=fixture();f.tick(11000);assert.equal(f.fetches.length,0);f.tick(1000);await flush();assert.equal(f.fetches.length,1,'12-second nonprogress triggers recovery');
 f=fixture();f.s.video.pause();f.tick(60000);await flush();assert.equal(f.fetches.length,0,'Pause never switches');
 f=fixture();f.s.document.hidden=true;f.tick(60000);await f.s.recoveryFail('fatal');assert.equal(f.fetches.length,0,'Background never switches');
 f=fixture();f.s.navigator.onLine=false;f.tick(60000);await f.s.recoveryFail('fatal');assert.equal(f.fetches.length,0,'Offline never burns retries');
 f=fixture();f.s.liveActive=true;f.tick(60000);await f.s.recoveryFail('fatal');assert.equal(f.fetches.length,0,'VOD recovery never touches live');
 f=fixture();let release;f.s.fetch=()=>new Promise(r=>{release=r;});let task=f.s.recoveryFail('fatal');await f.s.recoveryFail('duplicate');assert.equal(f.s.recovery.attempts,1,'Concurrent errors share one recovery');f.s.recoveryCancel();release({ok:true,json:async()=>({episodes:['a','b','c']})});await task;assert.equal(f.activated.length,0,'Back/cancel rejects late response');
 f=fixture();await f.s.recoveryFail('fatal');f.s.video.duration=60;f.s.recoveryRestore();await flush();assert.equal(f.activated.at(-1).index,2,'Short/mismatched version is skipped');assert.equal(f.s.recovery.position,137);
 f=fixture();f.s.recoveryCancel();f.s.video.currentTime=0;f.s.recoveryBegin(2);f.s.recoveryArmed();f.tick(19000);assert.equal(f.fetches.length,0);f.tick(1000);await flush();assert.equal(f.fetches.length,1,'Startup gets 20 seconds');
 f=fixture();f.tick(10000);f.s.video.seeking=true;f.events.seeking();f.tick(10000);assert.equal(f.fetches.length,0,'User seek gets a fresh grace period');f.s.video.seeking=false;
 f=fixture();await f.s.recoveryFail('fatal');await f.s.recoveryFail('fatal');await f.s.recoveryFail('fatal');await f.s.recoveryFail('fatal');assert.equal(f.activated.length,3);assert(f.s.recovery.exhausted,'Repeated starts stop at three alternatives');assert.equal(f.s.recovery.position,137);
 f=fixture();f.s.recovery.ready=false;f.s.recovery.position=0;f.s.video.currentTime=210;f.events.seeking();await f.s.recoveryFail('fatal before resume');assert.equal(f.s.recovery.restore,210,'History/user seek retained before first frame');
 const report={passed:true,checks:['ranked alternate','same episode','position and speed restored','failed sources never reused','missing episode skipped','three-alternative limit','known bad source skipped','12-second stalled clock','pause/background/offline/live exclusions','duplicate failure suppression','cancel ignores late detail','duration mismatch skipped','20-second startup timeout','seek grace period','progress survives consecutive failures','pre-play history seek survives failure']};
 fs.writeFileSync(require('./test-report.cjs')('beta13-failover-tests.json'),JSON.stringify(report,null,2));console.log(report);
})().catch(e=>{console.error(e);process.exitCode=1;});
