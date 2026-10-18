"""Apply shared mobile VOD policies to the remote-control TV client only."""
import re

def apply(source, root):
    def replace(old, new):
        nonlocal source
        if source.count(old) != 1:
            raise ValueError('TV adapter anchor changed: ' + old[:100])
        source = source.replace(old, new, 1)

    speed = (root/'mobile/quality-speed.js').read_text('utf8').replace('mobile-source-quality-v1', 'tv-source-quality-v2')
    speed = speed.replace(':e.error;', ":(e.error||'暂不可测');")
    quality = (root/'mobile/quality-integration.js').read_text('utf8').replace('mobile-quality-history', 'tv-quality-history').replace('mobileResume', 'tvResume')
    # Keep the focused source stationary during background measurements. The next
    # detail render applies the new order; navigation coordinates follow DOM order.
    quality = quality.replace("buttons.sort(function(a,b)", "if(!buttons.some(function(b){return b===document.activeElement;}))buttons.sort(function(a,b)")
    quality = quality.replace("var note=document.getElementById('speed-note');", "buttons=Array.prototype.slice.call(content.querySelectorAll('.source-row button'));buttons.forEach(function(b,i){b.dataset.row=1+Math.floor(i/5);b.dataset.col=i%5;});var note=document.getElementById('speed-note');")
    quality = quality.replace("row.appendChild(button('查找其他版本',at,2,function(){search(window.StarlightVersions.base(group.name),true);}));", '')
    quality = quality.replace("row.appendChild(button('重新测速',at,1,function(){cancelSpeed();runVodSpeed(true);}));", "row.appendChild(button('重新测速',at,1,function(){cancelSpeed();runVodSpeed(true);}));row.appendChild(button('查找其他版本',at,2,function(){search(window.StarlightVersions.base(group.name),true);}));")
    replace((root/'tv/tv-speed.js').read_text('utf8'), speed)
    replace((root/'tv/tv-speed-integration.js').read_text('utf8'), 'var tvResume=false;\n'+quality)
    source = (root/'mobile/versions.js').read_text('utf8')+'\n'+(root/'mobile/source-ranking.js').read_text('utf8')+'\n'+source
    old_name = re.search(r'^function nameKey\(t\)\{.*?\}\n', source, re.M).group(0)
    replace(old_name, "function nameKey(t){return window.StarlightVersions.base(t).toLowerCase().replace(/[\\s·:：《》]/g,'');}\n")
    replace('async function check(item,force){', 'async function check(item,force,expand){')
    replace('if(force&&old&&old.available){', 'if(force&&old&&old.available&&!expand){')
    replace('return (ai<0?20:ai)-(bi<0?20:bi);', 'return window.StarlightVersions.priority(b)-window.StarlightVersions.priority(a)||(ai<0?20:ai)-(bi<0?20:bi);')
    replace('var result=await inspect(item,rows[i],controller.signal);save(k,result);', 'var result=await inspect(item,rows[i],controller.signal);result.records=rows;save(k,result);')
    replace('availability.check(item,true).then', 'availability.check(item,true,true).then')
    replace('records:[result.record]};detail=result.detail;episode=0;', 'records:result.records||[result.record]};detail=result.detail;detail.sourceIndex=group.records.indexOf(result.record);episode=0;')
    replace("title(item.title,'正在复检播放源…');", "title(item.title,'正在查找全部匹配来源…');")
    replace("var key=compact(item.name)+'|'", "var key=compact(window.StarlightVersions.base(item.name))+'|'")
    replace("try{localStorage.setItem('tv-title-index',JSON.stringify(titleIndex));}", "list.forEach(function(x){x.records.sort(function(a,b){return window.StarlightVersions.priority(b)-window.StarlightVersions.priority(a);});});try{localStorage.setItem('tv-title-index',JSON.stringify(titleIndex));}")
    replace('group=item;loadDetail(0);', 'group=item;episode=0;loadDetail(0);')
    replace('detail.record=r;detail.sourceIndex=index;', 'detail.record=r;if(d.videoInfo){if(!r.language)r.language=d.videoInfo.language;if(!r.area)r.area=d.videoInfo.area;}detail.sourceIndex=index;')
    replace('function(){loadDetail(i);}', 'function(){qualityChooseSource(i);}')
    replace('function(){play(i);}', 'function(){qualityPlay(i);}')
    replace("same[0].scrollIntoView({block:'nearest',inline:'nearest'});", "same[0].scrollIntoView({block:'nearest',inline:'nearest'});var rect=same[0].getBoundingClientRect(),footer=document.querySelector('footer'),limit=footer?footer.getBoundingClientRect().top:window.innerHeight;if(rect.bottom>limit-12)window.scrollBy(0,rect.bottom-limit+12);")
    replace('detail.sourceIndex=index;renderDetail();', "detail.sourceIndex=index;renderDetail();if(tvResume){tvResume=false;if(detail.episodes[episode])play(episode);else osd('此来源缺少当前集，请选择其他来源');}")
    replace("title('这个来源暂时打不开'", "tvResume=false;detail=null;content.textContent='';title('这个来源暂时打不开'")
    replace("view=name;content.textContent='';", "view=name;if(name!=='detail')tvResume=false;content.textContent='';")
    replace('episode=index;playing=true;', 'episode=index;qualityStart();playing=true;')
    replace('function play(index){', (root/'mobile/failover.js').read_text('utf8')+'\nfunction play(index){var recoveryToken=recoveryBegin(index);')
    replace('if(data.fatal){if(availableItem)', 'if(recoveryToken!==recoveryEpoch)return;if(data.fatal){if(availableItem)')
    replace("loading.fail('这个来源暂时无法播放，请返回换源');osd('此来源播放失败，请按返回选择其他来源',true);", "recoveryFail('播放失败');")
    replace("console.log('TV_PLAY episode='+index);", "recoveryArmed();console.log('TV_PLAY episode='+index);")
    replace("if(pending)pending.catch(function(){loading.fail('按确认键开始播放，或返回重试');osd('按确认键开始播放',true);});", "if(pending)pending.catch(function(e){if(recoveryToken!==recoveryEpoch||e&&e.name==='AbortError')return;if(e&&e.name==='NotAllowedError'){if(recovery)recovery.intended=false;loading.fail('按确认键开始播放');}else recoveryFail('无法开始播放');});")
    replace('function stop(){', 'function stop(){recoveryCancel();')
    replace('function startLive(index,route){', 'function startLive(index,route){recoveryCancel();')
    replace('function loadDetail(index){', 'function loadDetail(index){recoveryCancel();')
    replace('video.onloadedmetadata=function(){', 'video.onloadedmetadata=function(){if(recoveryRestore())return;')
    replace("if(playing)loading.fail('视频暂时无法播放，请返回换源');if(playing)osd('视频暂时无法播放，请按返回换源',true);", "if(playing)recoveryFail('播放失败');")
    replace('video.onended=function(){', 'video.onended=function(){if(recovery&&(recovery.busy||recovery.restore!==null||recovery.exhausted))return;')
    replace('function save(){if(liveActive', 'function save(){if(recovery&&recovery.restore!==null)return;if(liveActive')
    replace("function cover(url){return /^https?:\\/\\//.test(url||'')?'/api/poster?url='+encodeURIComponent(url):'';}", (root/'tv/tv-posters.js').read_text('utf8'))
    replace("var url=cover(item.cover||item.pic);if(url){var img=el('img');img.src=url;img.alt='';img.onerror=function(){img.remove();p.insertBefore(el('span','','暂无海报'),p.firstChild);};p.appendChild(img);}else p.textContent='暂无海报';", "var img=el('img');p.appendChild(img);tvPoster(img,item,item.cover||item.pic);")
    replace('img.src=cover(detail.videoInfo.cover);info.appendChild(img);', 'info.appendChild(img);tvPoster(img,group,detail.videoInfo.cover);')
    return source
