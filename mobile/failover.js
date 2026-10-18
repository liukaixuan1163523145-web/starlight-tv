// Runs inside the player closure. One bounded recovery session per episode/play.
var recovery=null,recoveryPending=null,recoveryEpoch=0;
function recoveryKey(r){return r.sourceKey+':'+r.vodId;}
function recoveryCancel(){
 recoveryEpoch++;
 if(recovery&&recovery.controller)recovery.controller.abort();
 recovery=null;recoveryPending=null;
}
function recoveryBegin(index){
 var next=recoveryPending;recoveryPending=null;
 if(!next||next!==recovery||next.group!==group||next.episode!==index){
  recoveryCancel();
  next={group:group,episode:index,tried:{},attempts:0,position:0,duration:0,rate:video.playbackRate||1,restore:null};
  recovery=next;
 }
 next.token=++recoveryEpoch;next.record=detail.record;next.tried[recoveryKey(detail.record)]=true;
 next.busy=false;next.exhausted=false;next.preparing=true;next.intended=true;next.ready=false;
 next.lastProgress=Date.now();next.lastTime=0;
 return next.token;
}
function recoveryArmed(){if(recovery)recovery.preparing=false;}
function recoveryCurrent(s){return recovery===s&&group===s.group&&episode===s.episode&&playing&&!liveActive;}
function recoveryHold(){return document.hidden||typeof navigator!=='undefined'&&navigator.onLine===false;}
function recoverySnapshot(s){
 if(s.ready&&s.restore===null&&isFinite(video.currentTime))s.position=Math.max(0,video.currentTime);
 if(s.ready&&isFinite(video.duration)&&video.duration>0)s.duration=video.duration;
 if(s.restore===null)s.rate=video.playbackRate||s.rate||1;save();
}
function recoveryFinish(s){
 if(!recoveryCurrent(s))return;
 s.busy=false;s.exhausted=true;s.intended=false;video.pause();
 loading.fail('自动换源未成功，进度已保留。请返回选源或稍后重试');
 osd('可用备用源已尝试 · 自动切换最多 3 次',true);
}
async function recoveryFail(reason){
 var s=recovery;
 if(!s||!recoveryCurrent(s)||s.busy||s.exhausted||!s.intended)return;
 if(recoveryHold()){s.lastProgress=Date.now();return;}
 recoverySnapshot(s);qualityFailure();s.busy=true;
 video.pause();if(hls){hls.destroy();hls=null;}
 var candidates=group.records.map(function(r,i){return {record:r,index:i,score:qualityScore(r)};})
  .filter(function(x){var e=speed.get('vod:'+x.record.sourceKey+':'+x.record.vodId+':'+s.episode);return !s.tried[recoveryKey(x.record)]&&!(e&&!e.ok);})
  .sort(function(a,b){return b.score-a.score;});
 while(candidates.length&&s.attempts<3&&recoveryCurrent(s)){
  if(recoveryHold()){s.busy=false;s.lastProgress=Date.now();return;}
  var choice=candidates.shift(),r=choice.record;
  if(s.tried[recoveryKey(r)])continue;
  s.tried[recoveryKey(r)]=true;s.attempts++;
  loading.start({live:false,title:group.name,source:'自动换源 '+s.attempts+'/3 · '+r.sourceName,poster:cover(group.cover)});
  loading.stage(0,reason+'，正在连接备用来源');
  osd('正在换到 '+r.sourceName+' · 保留 '+Math.floor(s.position/60)+':'+String(Math.floor(s.position%60)).padStart(2,'0'),true);
  var controller=new AbortController();s.controller=controller;
  var timer=setTimeout(function(){controller.abort();},10000);
  try{
   var source=sources.filter(function(x){return x.key===r.sourceKey;})[0]||{key:r.sourceKey,name:r.sourceName,url:r.sourceUrl};
   var response=await fetch('/api/detail?id='+encodeURIComponent(r.vodId)+'&source='+encodeURIComponent(JSON.stringify(source)),{signal:controller.signal,credentials:'same-origin'});
   if(!response.ok)throw Error('来源详情不可用');
   var d=await response.json();
   if(!recoveryCurrent(s))return;
   if(!d.episodes||!d.episodes[s.episode])throw Error('缺少当前集数');
   d.record=r;d.sourceIndex=choice.index;
   if(d.videoInfo&&!r.language)r.language=d.videoInfo.language;
   detail=d;s.restore=s.position;s.seekApplied=false;s.busy=false;recoveryPending=s;
   play(s.episode);
   loading.stage(1,'已换到 '+r.sourceName+'，正在恢复播放进度');
   return;
  }catch(e){
   if(!recoveryCurrent(s))return;
   qualitySave(r,'failures','vod:'+r.sourceKey+':'+r.vodId+':'+s.episode);
  }finally{clearTimeout(timer);if(s.controller===controller)s.controller=null;}
 }
 if(recoveryCurrent(s))recoveryFinish(s);
}
// Return true to suppress the generic history seek while a recovery seek is pending.
function recoveryRestore(){
 var s=recovery;if(!s||s.restore===null||!recoveryCurrent(s))return false;
 var target=s.restore,duration=video.duration;
 if(!isFinite(duration)||duration<=0)return true;
 if(target>=duration-2&&target>0||s.duration>0&&Math.abs(duration-s.duration)>Math.max(60,s.duration*.1)){
  recoveryFail('备用版本时长不匹配');return true;
 }
 if(!s.seekApplied){
  try{video.currentTime=target;video.playbackRate=s.rate;s.seekApplied=true;s.lastProgress=Date.now();}catch(e){return true;}
 }
 return true;
}
function recoveryProgress(){
 var s=recovery;if(!s||!recoveryCurrent(s)||s.preparing||s.busy||s.exhausted)return;
 if(s.restore!==null){
  if(!s.seekApplied||Math.abs(video.currentTime-s.restore)>2)return;
  s.restore=null;s.seekApplied=false;
 }
 if(video.paused||video.seeking||recoveryHold())return;
 if(Math.abs(video.currentTime-s.lastTime)>.1){
  s.ready=true;s.lastTime=video.currentTime;s.lastProgress=Date.now();s.position=video.currentTime;
  if(isFinite(video.duration)&&video.duration>0)s.duration=video.duration;
 }
}
function recoveryTick(){
 var s=recovery;if(!s||!recoveryCurrent(s)||s.busy||s.exhausted||s.preparing)return;
 if(recoveryHold()||!s.intended){s.lastProgress=Date.now();return;}
 recoveryProgress();
 if(Date.now()-s.lastProgress>=(s.ready?12000:20000))recoveryFail(s.ready?'播放持续卡顿':'来源加载超时');
}
video.addEventListener('timeupdate',recoveryProgress);
video.addEventListener('seeked',recoveryProgress);
video.addEventListener('durationchange',recoveryRestore);
video.addEventListener('canplay',recoveryRestore);
video.addEventListener('play',function(){var s=recovery;if(s&&!s.preparing&&!s.busy){s.intended=true;s.lastProgress=Date.now();}});
video.addEventListener('pause',function(){var s=recovery;if(s&&!s.preparing&&!s.busy)s.intended=false;});
video.addEventListener('seeking',function(){
 var s=recovery;if(!s)return;s.lastProgress=Date.now();
 // A user/history seek is an intended position even if playback has not resumed yet.
 if(!s.preparing&&!s.busy&&s.restore===null&&isFinite(video.currentTime)){
  s.position=Math.max(0,video.currentTime);
  if(isFinite(video.duration)&&video.duration>0)s.duration=video.duration;
 }
});
setInterval(recoveryTick,1000);
