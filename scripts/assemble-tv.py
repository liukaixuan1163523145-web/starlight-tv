from pathlib import Path
import json
p=Path(__file__).resolve().parent.parent
backup=p/'tv-before-live.js'
if not backup.exists(): backup.write_bytes((p/'tv/tv.js').read_bytes())
s=backup.read_text(encoding='utf-8')
s=(p/'tv/tv-recommendation-cache.js').read_text(encoding='utf-8')+s[s.index('})(window);')+len('})(window);'):]
s=(p/'tv/tv-speed.js').read_text(encoding='utf-8')+'\n'+s
s=(p/'tv/tv-playback-loading.js').read_text(encoding='utf-8')+'\n'+s
s=s.replace('var playbackControls=', 'var loading=TVPlaybackLoading.create(player,video);\nvar playbackControls=',1)
channels=json.loads((p/'live-channels.json').read_text(encoding='utf-8'))['channels']
module=(p/'tv/tv-live.js').read_text(encoding='utf-8').replace('LIVE_CHANNELS_PLACEHOLDER',json.dumps(channels,ensure_ascii=False,separators=(',',':')))
s=s.replace("var cats=[['电影'", "var cats=[['直播','live'],['电影'",1)
s=s.replace("function home(push){", "function home(push){if(cats[category][1]==='live'){livePage();return;}",1)
s=s.replace("function back(){if(playing){", "function back(){if(liveActive){stop();livePage();return true;}if(playing){",1)
s=s.replace("if(view!=='home'){category=0;home(false);return true;}", "if(view==='live'){category=1;page=0;stack=[];home(false);return true;}if(view!=='home'){category=1;home(false);return true;}",1)
s=s.replace("function save(){if(!detail", "function save(){if(liveActive||!playing)return;if(!detail",1)
s=s.replace("function play(index){playbackControls.stop();", "function play(index){liveActive=false;document.getElementById('progress').style.display='';playbackControls.stop();",1)
s=s.replace("function stop(){playbackControls.stop();save();playing=false;", "function stop(){playbackControls.stop();save();clearTimeout(liveTimer);liveTimer=null;liveToken++;liveActive=false;liveFailed=false;playing=false;document.getElementById('progress').style.display='';",1)
s=s.replace("video.onloadedmetadata=function(){", "video.onloadedmetadata=function(){if(liveActive||!group)return;",1)
s=s.replace("video.onplaying=function(){osd('');};", "video.onplaying=function(){if(liveActive){liveProgress();}osd('');};",1)
s=s.replace("video.onwaiting=function(){if(playing)", "video.onwaiting=function(){if(liveActive)armLiveTimeout();if(playing)",1)
s=s.replace("video.onerror=function(){", "video.onerror=function(){if(liveActive){failLive();return;}",1)
s=s.replace("video.onended=function(){", "video.onended=function(){if(liveActive){failLive();return;}",1)
s=s.replace("video.ontimeupdate=function(){", "video.ontimeupdate=function(){if(liveActive){liveProgress();return;}",1)
s=s.replace("window.__tvRemote=function(key,repeat){", "var lastBackAt=0;\nwindow.__tvRemote=function(key,repeat){\n if(key==='back'){var now=Date.now();if(repeat||now-lastBackAt<350)return true;lastBackAt=now;}\n if(liveActive)return liveRemote(key,repeat);",1)
s=s.replace("if(playing&&[37,39,227,228]", "if(playing&&!liveActive&&[37,39,227,228]",1)
s=s.replace("function history(){",module+'\nfunction history(){',1)
s=s.replace('function stop(){playbackControls.stop();', 'function stop(){loading.stop();playbackControls.stop();',1)
s=s.replace("var url='/api/proxy?url='+encodeURIComponent(detail.episodes[index]);", "loading.start({live:false,title:group.name,source:'第 '+(index+1)+' 集 · '+detail.record.sourceName,poster:cover(group.cover)});var url='/api/proxy?url='+encodeURIComponent(detail.episodes[index]);",1)
s=s.replace("osd('此来源播放失败，请按返回选择其他来源',true);", "loading.fail('这个来源暂时无法播放，请返回换源');osd('此来源播放失败，请按返回选择其他来源',true);",1)
s=s.replace("hls.loadSource(url);hls.attachMedia(video);}else video.src=url;playbackControls.start();", "if(Hls.Events.MANIFEST_PARSED)hls.on(Hls.Events.MANIFEST_PARSED,function(){if(playing&&!liveActive)loading.stage(1,'来源已连接，正在缓冲画面');});hls.loadSource(url);hls.attachMedia(video);}else video.src=url;playbackControls.start();",1)
s=s.replace("if(playing)osd('视频暂时无法播放", "if(playing)loading.fail('视频暂时无法播放，请返回换源');if(playing)osd('视频暂时无法播放",1)
s=s.replace("pending.catch(function(){osd('按确认键开始播放',true);});", "pending.catch(function(){loading.fail('按确认键开始播放，或返回重试');osd('按确认键开始播放',true);});",1)
s=s.replace("document.getElementById('play-hint').textContent='确认 暂停", "if(!player.classList.contains('live-mode'))document.getElementById('play-hint').textContent='确认 暂停",1)
s=s.replace('liveActive=true;playing=true;', "liveActive=true;player.classList.add('live-mode');playing=true;",1)
s=s.replace('liveActive=false;liveFailed=false;playing=false;', "liveActive=false;player.classList.remove('live-mode');liveFailed=false;playing=false;",1)
# Start on the existing movie landing page; live is the first, immediately reachable tab.
s=s.replace('category=0,page=0,view=', 'category=1,page=0,view=',1)
# Speed measurement and expanded local recommendation library, preserving the live/player hooks above.
s=s.replace("['搜索','search']];", "['搜索','search'],['本地缓存','cache']];",1)
s=s.replace("function home(push){", "function home(push){if(cats[category][1]==='cache'){cachePage();return;}",1)
s=s.replace("function begin(name){", "function begin(name){cancelSpeed();",1)
s=s.replace("function play(index){", "function play(index){cancelSpeed();cachePlayState(true);",1)
s=s.replace("function stop(){", "function stop(){cancelSpeed();cachePlayState(false);",1)
s=s.replace("function startLive(index,route){", "function startLive(index,route){cancelSpeed();cachePlayState(true);",1)
s=s.replace("liveRoute=(route||0)%liveRoutes.length", "liveRoute=(route===undefined?fastestLive(liveChannels[index]):route)%liveRoutes.length",1)
s=s.replace("b.dataset.channel=c.id;", "b.dataset.channel=c.id;b.addEventListener('focus',function(){measureLive(c,b);});",1)
s=s.replace("sourceButtons();var info=", "sourceButtons();speedControls();var info=",1)
s=s.replace("sourceButtons();error(e);", "sourceButtons();speedControls();content.appendChild(el('p','empty error',e.message||String(e)));focus(1,0);",1)
s=s.replace("1+Math.ceil(group.records.length/5)","2+Math.ceil(group.records.length/5)")
s=s.replace("function history(){",(p/'tv/tv-speed-integration.js').read_text(encoding='utf-8')+'\n'+(p/'tv/tv-cache-center.js').read_text(encoding='utf-8')+'\nfunction history(){',1)
s=s.replace("document.getElementById('source-count').textContent=sources.length+' 个影视来源';", "document.getElementById('source-count').textContent=sources.length+' 个影视来源 · 自动测速';",1)
for d in [p/'tv',p/'app/public/tv']:
    (d/'tv.js').write_text(s,encoding='utf-8')
    import re
    html=re.sub(r'(tv\.(?:js|css)\?v=)[^\"<]+',r'\g<1>starlight-local-112-20261018',(p/'tv/tv.html').read_text(encoding='utf-8'))
    (d/'tv.html').write_text(html,encoding='utf-8')
css=(p/'tv/tv.css').read_text(encoding='utf-8')
if '/* Live TV */' not in css: css+='\n/* Live TV */\n.live-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-gap:1.3vw}.live-card{min-height:7vw;padding:1.2vw;text-align:left}.live-card strong{display:block;font-size:1.5vw;margin:.7vw 0}.live-card small{color:#a8bed1;font-size:1.05vw}.live-number{font-size:1.1vw;color:#7df1d1;font-weight:bold}\n'
css=css.split('/* Playback loading:')[0]+(p/'tv/tv-playback-loading.css').read_text(encoding='utf-8')
css+='\n/* Speed and library */\n.cache-stats{white-space:pre-line;font-size:1.5vw;line-height:1.8;color:#d7e8f5}.source-row{flex-wrap:wrap}.source-row button{font-size:1.1vw;white-space:normal}.live-card small{display:block;line-height:1.5}.live-card{min-height:8vw}\n'
for d in [p/'tv',p/'app/public/tv']: (d/'tv.css').write_text(css,encoding='utf-8')
print('Live UI integrated:',len(channels),'channels')
