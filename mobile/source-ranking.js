// Same policy for the detail list, playback settings and recommended source.
(function(root){'use strict';
function assess(record,entry,history){
 var e=entry,h=history||{},height=Number(h.height||e&&e.declaredHeight||0),mbps=Number(e&&e.mbps||0);
 // Require headroom above the playlist's bitrate; use conservative estimates when absent.
 var required=e&&e.declaredBandwidth?e.declaredBandwidth/1000000*1.35:height>=1080?8:height>=720?4:2;
 var failed=!!(e&&!e.ok),slow=!!(e&&e.ok&&(mbps<required||e.connectMs>4000||e.variation>.75));
 var troubled=(h.failures||0)>=2||(h.stalls||0)>=3||!!h.ad;
 var tier=failed?0:slow||troubled?1:e&&e.ok?3:2;
 var language=root.StarlightVersions.priority(record),languageTier=language>=20?3:language>0?2:language<0?0:1;
 // Cap the benefit at 1080p: a 4K label alone should not override mobile stability.
 var definition=height>=1080?3:height>=720?2:height>0?1:0;
 var transport=e&&e.ok?Math.min(50,mbps)*2+Math.max(0,20-(e.connectMs||0)/200)-Math.min(20,(e.variation||0)*20):0;
 var penalty=Math.min(90,(h.failures||0)*20+(h.stalls||0)*5+(h.ad?30:0));
 var score=tier*1000000+languageTier*10000+definition*1000+transport-penalty+Math.min(8,(h.successes||0)*2);
 var resolution=height?height+'P'+(h.height?'（实播）':'（列表标注）'):'清晰度未知';
 return {score:score,tier:tier,height:height,requiredMbps:required,resolution:resolution,
  status:failed?'本次测速失败':h.ad?'已标广告':troubled?'播放记录较差':slow?'偏慢或波动较大':e&&e.ok?'抽测流畅':'待测速'};
}
root.StarlightRanking={assess:assess};
})(window);
