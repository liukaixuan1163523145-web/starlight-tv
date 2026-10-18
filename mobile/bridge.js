// Executed inside the shared application's closure by assemble-mobile.py.
// The mobile shell owns presentation; these methods retain the tested data/player flows.
var mobileResume=false;
window.StarlightMobile={
 state:function(){return {view:view,category:cats[category][1],title:group&&group.name,episode:episode,
  episodes:detail&&detail.episodes?detail.episodes.length:0,localOnly:localOnly,
  sources:group?group.records.map(function(r,i){return {name:r.sourceName,index:i,speed:speed.get(vodSpeedKey(r)),quality:qualityScore(r),qualityLabel:qualityLabel(r),selected:!!detail&&detail.sourceIndex===i};}).sort(function(a,b){return b.quality-a.quality;}):[],
  fastest:group?fastestVod():-1};},
 history:function(){return history();},
 cover:cover,
 poster:mobilePoster,
 qualityLevels:function(){return hls?(hls.levels||[]).map(function(l,i){return {index:i,height:l.height||0,bitrate:l.bitrate||0};}):[];},
 qualityLevel:function(){return hls&&!hls.autoLevelEnabled?hls.loadLevel:-1;},
 chooseQuality:function(index){if(!hls||index<-1||index>=(hls.levels||[]).length||Math.floor(index)!==index)return false;hls.nextLevel=index;return true;},
 reportAd:function(){return detail&&qualitySave(detail.record,'ad');},
 adReported:function(){return !!(detail&&qualityRecord(detail.record).ad);},
 resume:function(item){remember();group=item;episode=item.episode||0;mobileResume=true;loadDetail(item.sourceIndex||0);},
 selectEpisode:function(index){if(episode===index)return;episode=index;cancelSpeed();if(!playing&&view==='detail'){refreshSpeedLabels();speedTimer=setTimeout(function(){runVodSpeed(false);},500);}},
 play:function(index){if(detail&&detail.episodes&&detail.episodes[index])qualityPlay(index);},
 source:function(index){mobileResume=false;qualityChooseSource(index);},
 switchPlayingSource:function(index){if(playing)stop();mobileResume=true;qualityChooseSource(index);},
 channels:function(){return liveChannels.map(function(c){return {id:c.id,name:c.name,height:channelQuality(c),routes:channelRoutes(c).length};});}
};
