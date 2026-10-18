(function(){'use strict';
var $=function(id){return document.getElementById(id);},icon=window.StarlightIcon,biz=window.StarlightMobile;
var player=$('player'),video=$('video'),controls=$('mobile-controls'),panel=$('mobile-panel'),seek=$('mobile-seek'),rate=$('mobile-rate');
var dragging=false,hideTimer=null,liveQuery='',onlyHD=false,episodePage=0,content=$('content'),nav=$('nav');
function node(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function button(text,fn,cls){var b=node('button',cls,text);b.type='button';b.onclick=fn;return b;}
Array.prototype.forEach.call(document.querySelectorAll('[data-icon]'),function(e){e.innerHTML=icon(e.dataset.icon);});
function remote(key){return !!(window.__tvRemote&&window.__tvRemote(key));}
function live(){return player.classList.contains('live-mode');}
function time(n){if(!isFinite(n)||n<0)return '00:00';n=Math.floor(n);var h=Math.floor(n/3600);return(h?h+':':'')+String(Math.floor(n%3600/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');}
function tab(name){var found=Array.prototype.find.call(nav.querySelectorAll('button'),function(b){return b.textContent===name;});if(found){found.click();window.scrollTo(0,0);episodePage=0;}return !!found;}
Array.prototype.forEach.call(document.querySelectorAll('[data-tab]'),function(b){b.onclick=function(){tab(b.dataset.tab);};});
$('source-count').onclick=function(){tab('本地缓存');};
$('mobile-page-back').onclick=function(){window.__starlightBack();};
function updateNav(){var state=biz.state(),active=nav.querySelector('button.active'),label=active?active.textContent:'';
 Array.prototype.forEach.call(nav.querySelectorAll('button'),function(b){b.dataset.hide=String(['直播','继续看','搜索','本地缓存','豆瓣推荐','烂番茄'].indexOf(b.textContent)>=0);});
 Array.prototype.forEach.call($('mobile-nav').querySelectorAll('[data-tab]'),function(b){var on=b.dataset.tab===label||(b.dataset.tab==='电影'&&['直播','搜索','继续看','本地缓存'].indexOf(label)<0)||(b.dataset.tab==='继续看'&&label==='本地缓存');b.classList.toggle('active',on);b.setAttribute('aria-current',on?'page':'false');});
 Array.prototype.forEach.call($('mobile-ranking').querySelectorAll('[data-tab]'),function(b){b.classList.toggle('active',b.dataset.tab===label);});
 nav.hidden=state.view!=='home';$('mobile-ranking').hidden=state.view!=='home';
 $('mobile-ranking').querySelector('h2').textContent=label==='烂番茄'?'烂番茄片单':label==='豆瓣推荐'?'高分片单':label+'片单';
 $('mobile-page-back').hidden=state.view==='home';
 $('mobile-continue').hidden=state.view!=='home'||!biz.history().length;
}
function continueRail(){var box=$('mobile-continue'),list=biz.history();box.textContent='';if(!list.length)return;
 var head=node('div','sec-h');head.appendChild(node('h2','','继续看'));head.appendChild(button('全部记录 ›',function(){tab('继续看');}));box.appendChild(head);
 var rail=node('div','continue-rail');list.slice(0,6).forEach(function(item){var card=button('',function(){biz.resume(item);},'continue-card'),still=node('div','continue-still'),img=node('img');still.appendChild(img);biz.poster(img,item,item.cover);var play=node('span');play.innerHTML=icon('play');still.appendChild(play);card.appendChild(still);card.appendChild(node('b','',item.name));card.appendChild(node('small','','第 '+((item.episode||0)+1)+' 集 · 看到 '+time(item.seconds)));rail.appendChild(card);});box.appendChild(rail);
}
function chooseEpisode(index){biz.selectEpisode(index);Array.prototype.forEach.call(content.querySelectorAll('.episodes button'),function(b,i){b.classList.toggle('primary',i===index);b.setAttribute('aria-pressed',String(i===index));});setCTA();}
function setCTA(){var state=biz.state();$('mobile-cta').hidden=state.view!=='detail'||!state.episodes||!content.querySelector('.episodes');$('mobile-start').innerHTML=icon('play');$('mobile-start').appendChild(node('span','','播放 第 '+(state.episode+1)+' 集'));$('mobile-start').disabled=!state.episodes;}
$('mobile-start').onclick=function(){biz.play(biz.state().episode);};
function detailLayout(){var info=content.querySelector('.detail'),sources=content.querySelector('.source-row'),eps=content.querySelector('.episodes');document.body.classList.toggle('has-detail',!!info);
 if(info&&content.firstChild!==info)content.insertBefore(info,content.firstChild);
 if(sources&&!content.querySelector('[data-section=sources]')){var heading=node('h2','section-heading','播放来源');heading.dataset.section='sources';content.insertBefore(heading,sources);}
 if(!eps)return;
 if(!eps.dataset.mobile){eps.dataset.mobile='true';episodePage=Math.floor(biz.state().episode/30);
  var heading=node('h2','section-heading','选集 · '+eps.children.length+' 集');content.insertBefore(heading,eps);
  if(eps.children.length>30){var ranges=node('div','episode-ranges');for(var i=0;i<Math.ceil(eps.children.length/30);i++)(function(page){ranges.appendChild(button((page*30+1)+'–'+Math.min((page+1)*30,eps.children.length),function(){episodePage=page;paginate();}));})(i);content.insertBefore(ranges,eps);}
  Array.prototype.forEach.call(eps.querySelectorAll('button'),function(b,i){b.onclick=function(){chooseEpisode(i);};});
 }
 paginate();chooseEpisode(biz.state().episode);
}
function paginate(){var eps=content.querySelector('.episodes');if(!eps)return;Array.prototype.forEach.call(eps.children,function(b,i){b.hidden=Math.floor(i/30)!==episodePage;});Array.prototype.forEach.call(content.querySelectorAll('.episode-ranges button'),function(b,i){b.classList.toggle('active',i===episodePage);});}
function liveFilter(){var all=biz.channels(),count=0;Array.prototype.forEach.call(content.querySelectorAll('.live-card'),function(card){var c=all.filter(function(x){return x.id===card.dataset.channel;})[0],query=liveQuery.replace(/[\s-]/g,'').toLowerCase();var yes=(!query||card.querySelector('strong').textContent.replace(/[\s-]/g,'').toLowerCase().indexOf(query)>=0)&&(!onlyHD||(c&&c.height>=720));card.hidden=!yes;if(yes)count++;});var empty=$('mobile-live-empty');if(empty)empty.hidden=count>0;}
function liveLayout(){if(!$('mobile-live-filter')){var row=node('div','live-filters');row.id='mobile-live-filter';var input=node('input');input.placeholder='搜索频道，如 CCTV-13';input.setAttribute('aria-label','搜索直播频道');input.value=liveQuery;input.oninput=function(){liveQuery=input.value;liveFilter();};row.appendChild(input);var hd=button('仅高清',function(){onlyHD=!onlyHD;hd.setAttribute('aria-pressed',String(onlyHD));liveFilter();});hd.setAttribute('aria-pressed',String(onlyHD));row.appendChild(hd);var grid=content.querySelector('.live-grid');if(grid)content.insertBefore(row,grid);var empty=node('p','live-empty','没有匹配频道，试试清空搜索或关闭仅高清');empty.id='mobile-live-empty';empty.hidden=true;content.appendChild(empty);var sub=content.querySelector('.subtitle');if(sub)sub.textContent=biz.channels().length+' 个频道 · 实时信号，不能回看或选集 · 直播需要联网';}liveFilter();}
function recordsLayout(){if(content.querySelector('.record-tabs'))return;var row=node('div','record-tabs'),cache=biz.state().view==='cache';row.appendChild(button('观看记录',function(){tab('继续看');},!cache?'primary':''));row.appendChild(button('片单与海报缓存',function(){tab('本地缓存');},cache?'primary':''));content.insertBefore(row,content.firstChild);}
var observer=new MutationObserver(enhance);
function observe(){observer.observe(content,{childList:true,subtree:true});observer.observe(nav,{childList:true,subtree:true});}
function enhance(){observer.disconnect();var state=biz.state();updateNav();
 if(state.view==='detail')detailLayout();else{document.body.classList.remove('has-detail');$('mobile-cta').hidden=true;}
 if(state.view==='live')liveLayout();if(state.view==='cache'||state.view==='history')recordsLayout();
 if(state.view==='home'){var listKey=JSON.stringify(biz.history());if($('mobile-continue').dataset.key!==listKey){continueRail();$('mobile-continue').dataset.key=listKey;}
  var stamp=Number(document.body.dataset.cacheDate),old=stamp&&Date.now()-stamp>30*86400000,banner=$('mobile-cache-age');if(old&&!banner){banner=node('div','banner');banner.id='mobile-cache-age';content.insertBefore(banner,content.firstChild);}if(banner){banner.hidden=!old;banner.textContent='推荐片单快照：'+new Date(stamp).toLocaleDateString()+'。本地版随新版数据包更新；播放源仍需联网检查。';}
 }
 Array.prototype.forEach.call(content.querySelectorAll('.empty'),function(e){e.classList.toggle('loading',/^正在|^首次加载/.test(e.textContent));});
 var input=content.querySelector('.search input');if(input){input.setAttribute('aria-label','搜索片名');input.setAttribute('enterkeyhint','search');input.setAttribute('autocomplete','off');}
 observe();
}
observe();enhance();
function showControls(){player.classList.remove('mobile-ui-hidden');clearTimeout(hideTimer);if(!video.paused&&!player.hidden&&panel.hidden)hideTimer=setTimeout(function(){if(!dragging&&!player.classList.contains('loading-visible')&&panel.hidden)player.classList.add('mobile-ui-hidden');},3000);}
video.addEventListener('click',function(){if(player.classList.contains('mobile-ui-hidden'))showControls();else if(!video.paused)player.classList.add('mobile-ui-hidden');});
video.addEventListener('dblclick',function(e){if(live())return;var rect=video.getBoundingClientRect();jump(e.clientX-rect.left<rect.width/2?-10:10);showControls();});
 [-1,1].forEach(function(side){var zone=node('div','mobile-tap-zone '+(side<0?'left':'right'));zone.setAttribute('aria-label',side<0?'双击快退10秒':'双击快进10秒');zone.onclick=function(){if(player.classList.contains('mobile-ui-hidden'))showControls();else if(!video.paused)player.classList.add('mobile-ui-hidden');};zone.ondblclick=function(){if(!live())jump(side*10);showControls();};player.insertBefore(zone,controls);});
controls.addEventListener('pointerdown',function(){clearTimeout(hideTimer);player.classList.remove('mobile-ui-hidden');});controls.addEventListener('pointerup',showControls);controls.addEventListener('change',showControls);
['play','pause','playing','waiting'].forEach(function(name){video.addEventListener(name,showControls);});
function closePanel(){panel.hidden=true;showControls();}
window.__starlightBack=function(){if(!panel.hidden){closePanel();return true;}if(document.fullscreenElement){document.exitFullscreen().catch(function(){});return true;}return remote('back');};
$('mobile-back').onclick=function(){window.__starlightBack();};
var orientationMode=$('mobile-orientation-mode');orientationMode.value=localStorage.getItem('mobile-orientation')||'auto';
function applyOrientation(mode){if(window.StarlightAndroid&&typeof StarlightAndroid.orientation==='function'){StarlightAndroid.orientation(mode);return;}if(screen.orientation&&screen.orientation.lock){if(mode==='auto'){screen.orientation.unlock();return;}screen.orientation.lock(mode).catch(function(){$('play-message').textContent='安卓版可锁定横竖屏；浏览器请开启设备自动旋转';});}}
function orientationLabel(){$('mobile-orientation').textContent=window.innerWidth>window.innerHeight?'竖屏':'横屏';}
function chooseOrientation(mode){orientationMode.value=mode;localStorage.setItem('mobile-orientation',mode);applyOrientation(mode);}
$('mobile-orientation').onclick=function(){chooseOrientation(window.innerWidth>window.innerHeight?'portrait':'landscape');};orientationMode.onchange=function(){chooseOrientation(orientationMode.value);};window.addEventListener('resize',orientationLabel);orientationLabel();
function update(){var isLive=live();controls.classList.toggle('is-live',isLive);$('mobile-prev').innerHTML=isLive?'上一台':icon('rew');$('mobile-next').innerHTML=isLive?'下一台':icon('fwd');$('mobile-prev').setAttribute('aria-label',isLive?'上一台':'快退10秒');$('mobile-next').setAttribute('aria-label',isLive?'下一台':'快进10秒');$('mobile-route').hidden=!isLive;$('mobile-rate-label').hidden=isLive;$('mobile-play').innerHTML=icon(video.paused?'play':'pause');$('mobile-play').setAttribute('aria-label',video.paused?'播放':'暂停');if(!dragging)$('mobile-position').textContent=time(video.currentTime);$('mobile-duration').textContent=time(video.duration);seek.disabled=!isFinite(video.duration)||video.duration<=0;if(!dragging)seek.value=seek.disabled?0:Math.round(video.currentTime/video.duration*1000);rate.value=String(video.playbackRate);}
function jump(delta){if(isFinite(video.duration)&&video.duration>0)video.currentTime=Math.max(0,Math.min(video.duration-.1,video.currentTime+delta));}
$('mobile-prev').onclick=function(){if(live())remote('up');else jump(-10);};$('mobile-next').onclick=function(){if(live())remote('down');else jump(10);};$('mobile-route').onclick=function(){remote('right');};
$('mobile-play').onclick=function(){if(video.paused){if(!video.currentSrc){remote('enter');return;}var p=video.play();if(p)p.catch(function(){$('play-message').textContent='暂时无法播放，请返回换源';});}else video.pause();};
seek.oninput=function(){dragging=true;$('mobile-position').textContent=time(Number(seek.value)/1000*video.duration);};
seek.onchange=function(){if(isFinite(video.duration)&&video.duration>0)video.currentTime=Number(seek.value)/1000*video.duration;dragging=false;update();showControls();};seek.addEventListener('pointercancel',function(){dragging=false;update();});
rate.onchange=function(){var value=Number(rate.value);try{video.playbackRate=value;var saved=JSON.parse(localStorage.getItem('tv-player-settings')||'{}');saved.rate=value;localStorage.setItem('tv-player-settings',JSON.stringify(saved));}catch(e){rate.value=String(video.playbackRate);}};
$('mobile-panel-close').onclick=closePanel;
$('mobile-settings').onclick=function(){var state=biz.state(),body=$('mobile-panel-content');body.textContent='';if(!live()){body.appendChild(node('h2','','广告处理'));var adButton=button('',function(){var on=localStorage.getItem('mobile-ad-filter')!=='off';localStorage.setItem('mobile-ad-filter',on?'off':'on');adLabel();},'source-choice');function adLabel(){var on=localStorage.getItem('mobile-ad-filter')!=='off';adButton.textContent='明确标记的插播过滤：'+(on?'开':'关');adButton.setAttribute('aria-pressed',String(on));}adLabel();body.appendChild(adButton);body.appendChild(node('p','subtitle','下次播放生效。仅过滤能明确识别的独立片段；画面内文字、二维码或未标记广告请换源。'));}body.appendChild(node('h2','','选集'));var eps=node('div','episodes');for(var i=0;i<state.episodes;i++)(function(index){eps.appendChild(button(String(index+1),function(){closePanel();biz.play(index);},index===state.episode?'primary':''));})(i);body.appendChild(eps);body.appendChild(node('h2','','播放来源'));state.sources.forEach(function(source){body.appendChild(button(source.name+' · '+source.qualityLabel,function(){closePanel();biz.switchPlayingSource(source.index);},'source-choice'+(source.selected?' primary':'')));});panel.hidden=false;clearTimeout(hideTimer);player.classList.remove('mobile-ui-hidden');};
video.addEventListener('loadedmetadata',function(){if(!live()){try{var value=JSON.parse(localStorage.getItem('tv-player-settings')||'{}').rate;if([.5,.75,1,1.25,1.5,2].indexOf(value)>=0)video.playbackRate=value;}catch(e){}}update();});
['timeupdate','durationchange','pause','play','ratechange','emptied'].forEach(function(name){video.addEventListener(name,update);});
new MutationObserver(function(){document.body.classList.toggle('mobile-playing',!player.hidden);applyOrientation(player.hidden?'auto':orientationMode.value);if(player.hidden){panel.hidden=true;if(document.fullscreenElement)document.exitFullscreen().catch(function(){});enhance();}showControls();update();}).observe(player,{attributes:true,attributeFilter:['hidden']});
document.addEventListener('visibilitychange',function(){if(document.hidden&&!video.paused)video.pause();});
function network(){$('mobile-network').hidden=navigator.onLine!==false;}window.addEventListener('online',network);window.addEventListener('offline',network);network();
if(window.visualViewport){window.visualViewport.addEventListener('resize',function(){document.body.classList.toggle('keyboard-open',window.innerHeight-window.visualViewport.height>150);});}
update();
})();
