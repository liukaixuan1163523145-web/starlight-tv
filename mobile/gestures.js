(function(){'use strict';
 var player=document.getElementById('player'),panel=document.getElementById('mobile-panel'),av=window.StarlightAV,state=null,suppressUntil=0,timer=null,hintTimer=null,playerWasHidden=true;
 var hud=document.createElement('div');hud.id='mobile-av-hud';hud.hidden=true;player.appendChild(hud);
 var rails={};
 ['brightness','volume'].forEach(function(mode){
  var rail=document.createElement('div');rail.className='mobile-av-rail '+mode;
  var label=document.createElement('span');label.className='mobile-av-name';label.textContent=mode==='brightness'?'亮度':'音量';rail.appendChild(label);
  var track=document.createElement('div');track.className='mobile-av-track';track.setAttribute('role','meter');track.setAttribute('aria-label',label.textContent);track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax','100');
  var fill=document.createElement('div');fill.className='mobile-av-fill';track.appendChild(fill);rail.appendChild(track);
  var value=document.createElement('span');value.className='mobile-av-value';rail.appendChild(value);
  var hint=document.createElement('small');hint.textContent=(mode==='brightness'?'左侧':'右侧')+'上下滑';rail.appendChild(hint);
  var direction=document.createElement('small');direction.textContent='↑ 增加 · ↓ 减少';rail.appendChild(direction);
  hud.appendChild(rail);rails[mode]={rail:rail,track:track,fill:fill,value:value};
 });
 function meter(mode,value){value=Math.max(0,Math.min(100,Number(value)||0));var r=rails[mode];r.fill.style.height=value+'%';r.value.textContent=value+'%';r.track.setAttribute('aria-valuenow',String(value));}
 function visible(){hud.hidden=player.hidden||!panel.hidden;if(!hud.hidden){meter('brightness',av.read('brightness'));meter('volume',av.read('volume'));}}
 function show(mode,value){clearTimeout(hintTimer);hud.classList.remove('hint-visible');meter(mode,value);hud.hidden=false;Object.keys(rails).forEach(function(k){rails[k].rail.classList.toggle('active',k===mode);});clearTimeout(timer);timer=setTimeout(function(){Object.keys(rails).forEach(function(k){rails[k].rail.classList.remove('active');});},1100);}
 function cancel(){state=null;clearTimeout(timer);Object.keys(rails).forEach(function(k){rails[k].rail.classList.remove('active');});visible();}
 function syncPlayer(){if(player.hidden){playerWasHidden=true;clearTimeout(hintTimer);hud.classList.remove('hint-visible');cancel();return;}if(playerWasHidden){playerWasHidden=false;hud.classList.add('hint-visible');clearTimeout(hintTimer);hintTimer=setTimeout(function(){hud.classList.remove('hint-visible');},3000);}visible();}
 new MutationObserver(visible).observe(panel,{attributes:true,attributeFilter:['hidden']});syncPlayer();
 player.addEventListener('pointerdown',function(e){
  suppressUntil=0;
  if(state){cancel();return;}if(player.hidden||e.isPrimary===false)return;
  if(!panel.hidden){if(!panel.contains(e.target))state={id:e.pointerId,x:e.clientX,y:e.clientY,dismiss:true};return;}
  var selection=document.getElementById('mobile-mask-select');
  if((selection&&!selection.hidden)||e.target.closest('button,input,select,label,#mobile-panel,#mobile-controls,.mobile-player-top,.mobile-ad-mask'))return;
  if(e.pointerType!=='touch'&&e.pointerType!=='pen')return;
  var rect=player.getBoundingClientRect(),mode=e.clientX-rect.left<rect.width/2?'brightness':'volume';
  state={id:e.pointerId,x:e.clientX,y:e.clientY,mode:mode,start:av.read(mode),height:rect.height,active:false};
 },true);
 player.addEventListener('pointermove',function(e){
  var s=state;if(!s||s.id!==e.pointerId)return;var dx=e.clientX-s.x,dy=e.clientY-s.y;
  if(s.dismiss){if(Math.abs(dx)+Math.abs(dy)>12)cancel();return;}
  if(!s.active){if(Math.abs(dx)>12&&Math.abs(dx)>Math.abs(dy)){cancel();return;}if(Math.abs(dy)<12||Math.abs(dy)<Math.abs(dx)*1.25)return;s.active=true;try{player.setPointerCapture(e.pointerId);}catch(ignore){}}
  e.preventDefault();e.stopImmediatePropagation();var value=Math.round(Math.max(s.mode==='brightness'?5:0,Math.min(100,s.start-dy/Math.max(160,s.height*.65)*100)));
  av.set(s.mode,value);show(s.mode,value);
 },{capture:true,passive:false});
 player.addEventListener('pointerup',function(e){
  var s=state;if(!s||s.id!==e.pointerId)return;state=null;
  if(s.dismiss){document.getElementById('mobile-panel-close').click();}
  if(s.dismiss||s.active){suppressUntil=Date.now()+450;e.preventDefault();e.stopImmediatePropagation();try{player.releasePointerCapture(e.pointerId);}catch(ignore){}}
 },true);
 player.addEventListener('pointercancel',cancel,true);
 ['click','dblclick'].forEach(function(n){player.addEventListener(n,function(e){if(Date.now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation();return;}if(!panel.hidden&&!panel.contains(e.target)){document.getElementById('mobile-panel-close').click();e.preventDefault();e.stopImmediatePropagation();}},true);});
 new MutationObserver(syncPlayer).observe(player,{attributes:true,attributeFilter:['hidden']});
})();
