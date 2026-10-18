(function(){'use strict';
 var video=document.getElementById('video'),player=document.getElementById('player'),mode=document.getElementById('mobile-ad-mode'),status=document.getElementById('mobile-ad-status'),notice=document.getElementById('mobile-ad-notice'),undo=document.getElementById('mobile-ad-undo');
 var worker=null,workerJob=null,busy=false,timer=null,epoch=0,pausedScannedEpoch=-1,hits=0,skipped=0,lastSkip=-100,undoAt=null,disabledForVideo=false;
 var canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
 mode.value=localStorage.getItem('mobile-ad-mode')||'mask';
 var masks=[],autoMaskSuppressed=false,maskLayer=document.getElementById('mobile-ad-masks'),selection=document.getElementById('mobile-mask-select'),draft=document.getElementById('mobile-mask-draft'),anchor=null,resumeAfterDraw=false;
 function diagnostic(event,fields){console.info('STARLIGHT_OCR_'+event+' '+JSON.stringify(fields||{}));}
 diagnostic('READY',{mode:mode.value});
 function videoBox(){var r=video.getBoundingClientRect(),p=player.getBoundingClientRect(),scale=Math.min(r.width/(video.videoWidth||1),r.height/(video.videoHeight||1)),width=video.videoWidth*scale,height=video.videoHeight*scale;return {x:r.left-p.left+(r.width-width)/2,y:r.top-p.top+(r.height-height)/2,width:width,height:height,left:p.left,top:p.top};}
 function renderMasks(){maskLayer.textContent='';var b=videoBox();masks.forEach(function(m){var e=document.createElement('div');e.className='mobile-ad-mask';e.style.left=(b.x+m.x*b.width)+'px';e.style.top=(b.y+m.y*b.height)+'px';e.style.width=(m.w*b.width)+'px';e.style.height=(m.h*b.height)+'px';var close=document.createElement('button');close.textContent='×';close.setAttribute('aria-label','取消此广告遮挡');close.onclick=function(){masks=masks.filter(function(x){return x!==m;});if(m.auto)autoMaskSuppressed=true;renderMasks();};e.appendChild(close);maskLayer.appendChild(e);});}
 function clearAuto(){masks=masks.filter(function(m){return !m.auto;});renderMasks();}
 function automaticMask(data,image){
  if(autoMaskSuppressed)return;
  var lines=[];(data.blocks||[]).forEach(function(b){(b.paragraphs||[]).forEach(function(p){(p.lines||[]).forEach(function(l){var text=(l.text||'').replace(/\s+/g,'');if(/棋牌|博彩|赌博|真人娱乐|捕鱼|赌场|赞助发布|主营|注册送|充值|(?:[a-z0-9-]+\.)+(?:com|net|vip|cc|bet|club|top|xyz)/i.test(text)&&l.bbox)lines.push(l.bbox);});});});
  if(!lines.length){diagnostic('MASK_REJECT',{reason:'no-lines'});return;}var x=Math.max(0,Math.min.apply(null,lines.map(function(b){return b.x0;}))-8),y=Math.max(0,Math.min.apply(null,lines.map(function(b){return b.y0;}))-8),right=Math.min(image.width,Math.max.apply(null,lines.map(function(b){return b.x1;}))+8),bottom=Math.min(image.height,Math.max.apply(null,lines.map(function(b){return b.y1;}))+8);
  var m={x:x/image.width,y:y/image.height,w:(right-x)/image.width,h:(bottom-y)/image.height,auto:true};if(m.w*m.h>.3||m.h>.45){diagnostic('MASK_REJECT',{reason:'area',width:m.w,height:m.h});return;}
  diagnostic('MASK',{lines:lines.length,width:m.w,height:m.h});
  masks=masks.filter(function(m){return !m.auto;});masks.push(m);renderMasks();
 }
 document.getElementById('mobile-mask-clear').onclick=function(){masks=[];autoMaskSuppressed=true;renderMasks();say('已清除遮挡，本次播放暂停自动遮挡');};
 document.getElementById('mobile-mask-draw').onclick=function(){if(!video.videoWidth)return;document.getElementById('mobile-panel').hidden=true;resumeAfterDraw=!video.paused;video.pause();selection.hidden=false;notice.hidden=true;};
 function finishDraw(){selection.hidden=true;draft.hidden=true;anchor=null;if(resumeAfterDraw)video.play().catch(function(){});}
 document.getElementById('mobile-mask-cancel').onclick=finishDraw;
 function point(e){var b=videoBox();return {x:Math.max(0,Math.min(1,(e.clientX-b.left-b.x)/b.width)),y:Math.max(0,Math.min(1,(e.clientY-b.top-b.y)/b.height))};}
 selection.onpointerdown=function(e){if(e.target.closest('button')||e.target.closest('p'))return;anchor=point(e);selection.setPointerCapture(e.pointerId);draft.hidden=false;};
 selection.onpointermove=function(e){if(!anchor)return;var q=point(e),b=videoBox();draft.style.left=(b.x+Math.min(anchor.x,q.x)*b.width)+'px';draft.style.top=(b.y+Math.min(anchor.y,q.y)*b.height)+'px';draft.style.width=(Math.abs(q.x-anchor.x)*b.width)+'px';draft.style.height=(Math.abs(q.y-anchor.y)*b.height)+'px';};
 selection.onpointerup=function(e){if(!anchor)return;var q=point(e),m={x:Math.min(anchor.x,q.x),y:Math.min(anchor.y,q.y),w:Math.abs(q.x-anchor.x),h:Math.abs(q.y-anchor.y),auto:false};if(m.w>.01&&m.h>.01&&m.w*m.h<=.4){masks.push(m);masks=masks.slice(-6);renderMasks();finishDraw();}else{anchor=null;draft.hidden=true;selection.querySelector('p').firstChild.textContent='请重新框选较小的广告区域 · ';}};
 selection.onpointercancel=function(){anchor=null;draft.hidden=true;};
 window.addEventListener('resize',renderMasks);video.addEventListener('loadedmetadata',renderMasks);
 var oldBack=window.__starlightBack;window.__starlightBack=function(){if(!selection.hidden){finishDraw();return true;}return oldBack();};
 document.getElementById('mobile-ad-dismiss').onclick=function(){notice.hidden=true;};
 function eligible(){return mode.value!=='off'&&!disabledForVideo&&!document.hidden&&!player.hidden&&!player.classList.contains('live-mode')&&!video.seeking&&video.readyState>=2&&video.videoWidth>0;}
 function say(message){if(status.textContent!==message)diagnostic('STATE',{message:message});status.textContent=message;}
 function show(message){notice.querySelector('span').textContent=message;notice.hidden=false;}
 async function getWorker(){
  if(worker)return worker;if(workerJob)return workerJob;
  say('正在准备本机识别模型…');
  workerJob=(async function(){
   if(!window.Tesseract)await new Promise(function(resolve,reject){var s=document.createElement('script');s.src='/mobile/ocr/tesseract.min.js';s.onload=resolve;s.onerror=function(){s.remove();reject(Error('OCR library unavailable'));};document.head.appendChild(s);});
   var lastStage='';var w=await Tesseract.createWorker(['chi_sim','eng'],1,{workerPath:location.origin+'/mobile/ocr/worker.min.js',corePath:location.origin+'/mobile/ocr',langPath:location.origin+'/mobile/ocr',workerBlobURL:false,logger:function(m){if(m.status!==lastStage){lastStage=m.status;diagnostic('WORKER',{stage:lastStage});}},errorHandler:function(e){diagnostic('WORKER_ERROR',{message:String(e)});say('识别暂不可用，可关闭后重试');}});
   await w.setParameters({tessedit_pageseg_mode:'11'});worker=w;return w;
  })().finally(function(){workerJob=null;});return workerJob;
 }
 function frame(){var width=Math.min(1280,video.videoWidth);canvas.width=width;canvas.height=Math.round(width*video.videoHeight/video.videoWidth);ctx.drawImage(video,0,0,canvas.width,canvas.height);return ctx.getImageData(0,0,canvas.width,canvas.height);}
 function darkness(image){var dark=0,total=0,d=image.data;for(var i=0;i<d.length;i+=64){total++;if(Math.max(d[i],d[i+1],d[i+2])<45)dark++;}return dark/Math.max(1,total);}
 function schedule(delay){clearTimeout(timer);if(eligible()&&(!video.paused||pausedScannedEpoch!==epoch))timer=setTimeout(scan,typeof delay==='number'?delay:2500);}
 async function scan(){
  if(busy||!eligible())return;busy=true;var token=epoch;
  try{
   var w=await getWorker();if(token!==epoch||!eligible())return;
   var started=Date.now(),captured=video.currentTime,image=frame(),dark=darkness(image);say('正在本机识别广告文字…');
   var result=await w.recognize(canvas,{}, {text:true,blocks:true});if(token!==epoch||!eligible())return;
   if(video.paused)pausedScannedEpoch=epoch;
   var check=StarlightAdPolicy.classify(result.data.text,result.data.confidence,dark);
   diagnostic('RESULT',{ms:Date.now()-started,width:image.width,height:image.height,confidence:result.data.confidence,characters:result.data.text.length,hits:check.hits.length,suspected:check.suspected,blocks:(result.data.blocks||[]).length,dark:Math.round(dark*100)});
   if(!check.suspected){hits=0;clearAuto();say('识别中 · 暂未发现明确广告');if(undoAt===null)notice.hidden=true;return;}
   automaticMask(result.data,image);
   hits=check.fullScreen?hits+1:0;
   if(!check.fullScreen){say('已尝试局部遮挡；漏识别可手动框选');return;}
   say(hits<2?'发现疑似广告，正在复核…':'已连续识别到疑似广告');
   if(mode.value!=='auto'){say(masks.some(function(m){return m.auto;})?'已自动遮挡广告文字':'发现疑似广告，但未定位到合适遮挡区域');return;}
   if(video.paused){say('已检查暂停画面 · 暂停时不会自动跳过');return;}
   if(hits<2||skipped>=18||video.currentTime-lastSkip<2||Math.abs(video.currentTime-captured)>4||!isFinite(video.duration)||video.duration-video.currentTime<6)return;
   // Recheck the current picture so a stale OCR result cannot skip a newly resumed scene.
   if(darkness(frame())<.82){hits=0;return;}
   var from=video.currentTime;if(undoAt===null)undoAt=from;video.currentTime=Math.min(video.duration-.2,from+3);lastSkip=video.currentTime;skipped+=3;undo.hidden=false;
   show('已跳过疑似广告 3 秒 · 本次累计 '+skipped+' 秒');say(skipped>=18?'已达本片自动跳过上限，请手动换源':'已跳过 3 秒，正在重新识别');
  }catch(e){console.warn('STARLIGHT_OCR_ERROR '+(e&&e.message||String(e)));if(token===epoch){disabledForVideo=true;clearAuto();say('本机识别暂不可用，正常播放不受影响');}}
  finally{busy=false;schedule();}
 }
 function reset(){epoch++;pausedScannedEpoch=-1;hits=0;skipped=0;lastSkip=-100;undoAt=null;disabledForVideo=false;undo.hidden=true;notice.hidden=true;masks=[];autoMaskSuppressed=false;renderMasks();selection.hidden=true;anchor=null;clearTimeout(timer);say(mode.value==='off'?'未开启；识别只在本机进行':'等待视频画面后开始识别');}
 mode.onchange=function(){localStorage.setItem('mobile-ad-mode',mode.value);reset();schedule();if(mode.value==='off'&&worker&&!busy){worker.terminate();worker=null;}};
 undo.onclick=function(){if(undoAt!==null&&isFinite(video.duration))video.currentTime=Math.min(undoAt,video.duration-.2);disabledForVideo=true;epoch++;clearTimeout(timer);undo.hidden=true;show('已撤销，本次播放停止自动识别');say('已撤销跳过，本次播放关闭识别');};
 video.addEventListener('emptied',reset);video.addEventListener('playing',function(){schedule(150);});video.addEventListener('seeked',function(){epoch++;hits=0;clearAuto();schedule(150);});video.addEventListener('pause',function(){epoch++;hits=0;schedule(150);});video.addEventListener('loadeddata',function(){schedule(150);});
 new MutationObserver(function(){if(player.hidden){epoch++;clearTimeout(timer);clearAuto();}else schedule(150);}).observe(player,{attributes:true,attributeFilter:['hidden']});
 document.addEventListener('visibilitychange',function(){epoch++;hits=0;schedule();});
 reset();
})();
