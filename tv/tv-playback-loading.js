(function(root){'use strict';
function create(player,video){
var panel=document.createElement('div');panel.id='play-loading';panel.hidden=true;
panel.innerHTML='<div class="loading-card"><div class="loading-art"><img alt=""><span>TV</span><small>电视直播</small></div><div class="loading-copy"><div class="loading-eyebrow"></div><h2></h2><p class="loading-source"></p><div class="loading-status" role="status" aria-live="polite"><i></i><strong></strong></div><div class="loading-track"><i></i></div><div class="loading-steps"><span>连接频道</span><span>缓冲画面</span><span>开始播放</span></div><p class="loading-elapsed"></p></div></div><div class="loading-help"></div>';
player.appendChild(panel);var active=false,started=false,failed=false,timer=null,since=0,info=null;
function q(s){return panel.querySelector(s);}
function tick(){var seconds=Math.floor((Date.now()-since)/1000);q('.loading-elapsed').textContent=failed?'可以立即换台或返回，不用继续等待':(seconds?'已等待 '+seconds+' 秒':'正在准备')+(seconds>=8?' · 这条线路较慢，可随时返回':'');}
function stage(index,text){if(!active||failed)return;q('.loading-status strong').textContent=text;var steps=panel.querySelectorAll('.loading-steps span');for(var i=0;i<steps.length;i++)steps[i].className=i<index?'done':i===index?'current':'';}
function show(){if(!active)return;panel.hidden=false;player.classList.add('loading-visible');clearInterval(timer);tick();timer=setInterval(tick,1000);}
function hide(){panel.hidden=true;player.classList.remove('loading-visible');clearInterval(timer);timer=null;}
function start(data){info=data;active=true;started=false;failed=false;since=Date.now();panel.className='';q('h2').textContent=data.title;q('.loading-eyebrow').textContent=data.live?'LIVE / 正在为你连接':'LIBRETV / 准备播放';q('.loading-source').textContent=data.source||'';q('.loading-art span').textContent=data.live?'TV':'▶';q('.loading-art small').textContent=data.live?'电视直播':'即将播放';var img=q('.loading-art img');img.style.display='none';img.onload=function(){img.style.display='block';};img.onerror=function(){img.style.display='none';};if(data.poster)img.src=data.poster;else img.removeAttribute('src');q('.loading-help').textContent=data.live?'↑ ↓ 换台　·　← → 切线路　·　确认重连　·　返回列表':'返回键回到选集页，可选择其他来源';q('.loading-steps span').textContent=data.live?'连接频道':'连接来源';stage(0,data.retry?'正在重新连接频道':'正在连接播放来源');show();}
function fail(message){if(!active)return;failed=true;panel.className='failed';q('.loading-status strong').textContent=message||'这条线路暂时无法播放';q('.loading-help').textContent=info.live?'确认键重试　·　↑ ↓ 换台　·　返回频道列表':'返回选集页，选择其他来源';show();clearInterval(timer);timer=null;}
video.addEventListener('playing',function(){if(active){started=true;failed=false;hide();}});
video.addEventListener('loadeddata',function(){stage(2,'画面已就绪，正在开始播放');});
video.addEventListener('waiting',function(){if(!active||failed||(started&&video.paused))return;if(started){since=Date.now();panel.className='rebuffer';show();}stage(1,'正在缓冲画面');});
return {start:start,stage:stage,fail:fail,stop:function(){active=false;started=false;failed=false;hide();},isVisible:function(){return !panel.hidden;}};
}
root.TVPlaybackLoading={create:create};
})(window);
