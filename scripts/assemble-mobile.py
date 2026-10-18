"""Build a touch client from shared TV features without changing the TV bundle."""
from pathlib import Path
import re, shutil, json

root=Path(__file__).resolve().parent.parent
source=(root/'tv/tv.js').read_text('utf8')
def replace(old,new):
    global source
    if source.count(old)!=1: raise ValueError('Shared UI changed; review mobile adapter: '+old[:70])
    source=source.replace(old,new,1)

replace((root/'tv/tv-speed.js').read_text('utf8'),(root/'mobile/quality-speed.js').read_text('utf8'))
replace((root/'tv/tv-speed-integration.js').read_text('utf8'),(root/'mobile/quality-integration.js').read_text('utf8'))
source=(root/'mobile/versions.js').read_text('utf8')+'\n'+source
source=(root/'mobile/source-ranking.js').read_text('utf8')+'\n'+source
# Preserve all matching recommendation versions, not only the first working record.
old_name=re.search(r'^function nameKey\(t\)\{.*?\}\n',source,re.M).group(0)
replace(old_name,"function nameKey(t){return window.StarlightVersions.base(t).toLowerCase().replace(/[\\s·:：《》]/g,'');}\n")
replace('async function check(item,force){','async function check(item,force,expand){')
replace('if(force&&old&&old.available){','if(force&&old&&old.available&&!expand){')
replace('return (ai<0?20:ai)-(bi<0?20:bi);','return window.StarlightVersions.priority(b)-window.StarlightVersions.priority(a)||(ai<0?20:ai)-(bi<0?20:bi);')
replace('var result=await inspect(item,rows[i],controller.signal);save(k,result);','var result=await inspect(item,rows[i],controller.signal);result.records=rows;save(k,result);')
replace("availability.check(item,true).then", "availability.check(item,true,true).then")
replace("records:[result.record]};detail=result.detail;episode=0;", "records:result.records||[result.record]};detail=result.detail;detail.sourceIndex=group.records.indexOf(result.record);episode=0;")
replace("title(item.title,'正在复检播放源…');", "title(item.title,'正在查找原声与全部匹配来源…');")
replace("var key=compact(item.name)+'|'", "var key=compact(window.StarlightVersions.base(item.name))+'|'")
replace("try{localStorage.setItem('tv-title-index',JSON.stringify(titleIndex));}", "list.forEach(function(x){x.records.sort(function(a,b){return window.StarlightVersions.priority(b)-window.StarlightVersions.priority(a);});});try{localStorage.setItem('tv-title-index',JSON.stringify(titleIndex));}")
replace("detail.record=r;detail.sourceIndex=index;", "detail.record=r;if(d.videoInfo&&d.videoInfo.language&&!r.language)r.language=d.videoInfo.language;detail.sourceIndex=index;")
replace("function(){loadDetail(i);}", "function(){qualityChooseSource(i);}")

additional=[{k:s[k] for k in ['name','url','isAdult']} for s in json.loads((root/'mobile/source-catalog.json').read_text('utf8'))['sources']]
replace("sources=(s.defaultSources||[]).map", "sources=(function(base){base=base.slice();"+json.dumps(additional,ensure_ascii=False)+".forEach(function(x){if(!base.some(function(b){return b.url.replace(/\\/+$/,'')===x.url.replace(/\\/+$/,'');}))base.push(x);});return base;})(s.defaultSources||[]).map")

assert 'generation=0,category=1,page=0' in source, 'Expected shared movie home default'
# No desktop focus/scroll jumps after an asynchronous response on a touch screen.
source,n=re.subn(r'^function focus\(row,col\)\{.*?\}\n', 'function focus(row,col){}\n',source,flags=re.M)
assert n==1
replace("go.type='submit';", "go.type='button';")
replace("view=name;content.textContent='';", "view=name;document.body.dataset.view=name;content.textContent='';")
replace("function renderNav(){nav.textContent='';", "function renderNav(){document.body.dataset.category=cats[category][1];nav.textContent='';")
replace("window.__tvRemote=function(key,repeat){", (root/'mobile/bridge.js').read_text('utf8')+"\nwindow.__tvRemote=function(key,repeat){")
replace("detail.sourceIndex=index;renderDetail();", "detail.sourceIndex=index;renderDetail();if(mobileResume&&detail.episodes.length){mobileResume=false;play(Math.min(episode,detail.episodes.length-1));}")
replace("title('这个来源暂时打不开'", "mobileResume=false;detail=null;content.textContent='';title('这个来源暂时打不开'")
replace("view=name;document.body.dataset.view=name;", "view=name;if(name!=='detail')mobileResume=false;document.body.dataset.view=name;")
replace("'豆瓣 '+score.toFixed(1)+' / 10'", "'豆瓣 '+score.toFixed(1)")
replace("function cacheLabel(data){", "function cacheLabel(data){document.body.dataset.cacheDate=String(data.fetchedAt||'');")
replace("validRating(item.rating)!==null?'选中查找播放来源':'豆瓣暂无评分'", "[item.year,item.isTv?'剧集':'电影'].filter(Boolean).join(' · ')")
source=source.replace('LIBRETV / 准备播放','星幕 / 准备播放').replace('返回回到选集页','返回选集页')
replace("episode=index;playing=true;", "episode=index;qualityStart();playing=true;")
replace("loading.fail('这个来源暂时无法播放，请返回换源');", "qualityFailure();loading.fail('这个来源暂时无法播放，请返回换源');")
# Recovery lives inside the shared closure; each playback gets a stale-callback token.
replace("function play(index){", (root/'mobile/failover.js').read_text('utf8')+"\nfunction play(index){var recoveryToken=recoveryBegin(index);")
replace("if(data.fatal){if(availableItem)", "if(recoveryToken!==recoveryEpoch)return;if(data.fatal){if(availableItem)")
replace("qualityFailure();loading.fail('这个来源暂时无法播放，请返回换源');osd('此来源播放失败，请按返回选择其他来源',true);", "recoveryFail('播放失败');")
replace("console.log('TV_PLAY episode='+index);", "recoveryArmed();console.log('TV_PLAY episode='+index);")
replace("if(pending)pending.catch(function(){loading.fail('按确认键开始播放，或返回重试');osd('按确认键开始播放',true);});", "if(pending)pending.catch(function(e){if(recoveryToken!==recoveryEpoch||e&&e.name==='AbortError')return;if(e&&e.name==='NotAllowedError'){if(recovery)recovery.intended=false;loading.fail('点击播放继续');}else recoveryFail('无法开始播放');});")
replace("function stop(){", "function stop(){recoveryCancel();")
replace("function startLive(index,route){", "function startLive(index,route){recoveryCancel();")
replace("function loadDetail(index){", "function loadDetail(index){recoveryCancel();")
replace("video.onloadedmetadata=function(){", "video.onloadedmetadata=function(){if(recoveryRestore())return;")
replace("if(playing)loading.fail('视频暂时无法播放，请返回换源');if(playing)osd('视频暂时无法播放，请按返回换源',true);", "if(playing)recoveryFail('播放失败');")
replace("video.onended=function(){", "video.onended=function(){if(recovery&&(recovery.busy||recovery.restore!==null||recovery.exhausted))return;")
replace("function save(){if(liveActive", "function save(){if(recovery&&recovery.restore!==null)return;if(liveActive")
replace("window.addEventListener('keydown',function(e){var keys=", "window.addEventListener('keydown',function(e){if(e.target&&/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))return;var keys=")
source=source.replace('↑↓←→ 选择，确认播放 · 返回键回首页', '点击频道播放 · 可切换备用线路')
source=source.replace('方向键选择 · 确认键设置 · 返回键收起', '点击设置播放选项')
source=source.replace('按返回换源','点返回换源').replace('确认键重新连接','点播放重新连接').replace('按确认键开始播放','点击播放开始播放')
source=source.replace('确认重试，↑↓换台，返回列表','点播放重试，点上下台换台，返回列表')
source=source.replace('返回键','返回').replace('选中海报后','点击海报后').replace('选中查找','点击查找')
source=source.replace('片单和海报保存在电视上','片单和海报保存在手机上')
source=source.replace('保存在这台电视上','保存在这台手机上')
source=source.replace('↑ ↓ 换台　·　← → 切线路　·　确认重连　·　返回列表','点击上下台换台 · 换线路 · 返回列表')
source=source.replace('确认键重试　·　↑ ↓ 换台　·　返回频道列表','点播放重试 · 点击上下台换台 · 返回列表')
source=source.replace('返回回到选集页','返回选集页').replace('可以立即换台或返回，不用继续等待','可以换来源或返回，不用继续等待')
# Preserve offline recommendation art, but cache new artwork returned by source searches.
replace("function cover(url){return /^https?:\\/\\//.test(url||'')?'/api/poster?url='+encodeURIComponent(url):'';}", (root/'mobile/posters.js').read_text('utf8'))
replace("var url=cover(item.cover||item.pic);if(url){var img=el('img');img.src=url;img.alt='';img.onerror=function(){img.remove();p.insertBefore(el('span','','暂无海报'),p.firstChild);};p.appendChild(img);}else p.textContent='暂无海报';", "var img=el('img');p.appendChild(img);mobilePoster(img,item,item.cover||item.pic);")
replace("img.src=cover(detail.videoInfo.cover);info.appendChild(img);", "info.appendChild(img);mobilePoster(img,group,detail.videoInfo.cover);")
source=source.replace('本地数据版：无需 API Key，不联网更新片单和海报','本地数据版：片单离线读取；海报优先本地，缺图下载后缓存')
replace("var url='/api/proxy?url='+encodeURIComponent(detail.episodes[index]);", "var url='/api/proxy?'+(localStorage.getItem('mobile-ad-filter')==='off'?'':'adFilter=1&')+'url='+encodeURIComponent(detail.episodes[index]);")
dest=root/'app/public/mobile';dest.mkdir(parents=True,exist_ok=True)
for name in ['index.html','tokens.css','icons.js','mobile.css','mobile.js','ad-policy.js','ad-scanner.js','player-settings.js','fullscreen.js','gestures.js']:shutil.copy2(root/'mobile'/name,dest/name)
(dest/'app.js').write_text(source,encoding='utf8')
print('Mobile touch client assembled, shared search/live/cache features retained.')
