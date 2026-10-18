(function(){'use strict';
 var $=function(id){return document.getElementById(id);},video=$('video'),player=$('player'),panel=$('mobile-panel'),biz=window.StarlightMobile,native=window.StarlightAndroid;
 var light=$('mobile-brightness'),volume=$('mobile-volume'),quality=$('mobile-quality'),lightMode=localStorage.getItem('mobile-brightness')||'auto',lastLevels='',syncTimer=null;
 light.value=lightMode==='auto'?50:Math.max(5,Math.min(100,Number(lightMode)||50));
 function brightnessLabel(){if(!native||!native.brightness){$('mobile-brightness-value').textContent='安卓版可用';return;}$('mobile-brightness-value').textContent=lightMode==='auto'?'跟随系统':light.value+'%';}
 function setBrightness(){if(native&&native.brightness)native.brightness(player.hidden||lightMode==='auto'?-1:Number(light.value));brightnessLabel();}
 light.oninput=function(){lightMode=light.value;localStorage.setItem('mobile-brightness',lightMode);setBrightness();};
 $('mobile-brightness-auto').onclick=function(){lightMode='auto';localStorage.setItem('mobile-brightness','auto');setBrightness();};
 if(!native||!native.brightness){light.disabled=true;$('mobile-brightness-auto').disabled=true;$('mobile-brightness-value').textContent='安卓版可用';}else brightnessLabel();
 function syncVolume(){var v=native&&native.mediaVolume?native.mediaVolume():Math.round(video.volume*100);if(v>=0){volume.value=v;$('mobile-volume-value').textContent=v+'%';}}
 volume.oninput=function(){var v=Number(volume.value);if(native&&native.setMediaVolume)native.setMediaVolume(v);else video.volume=v/100;$('mobile-volume-value').textContent=v+'%';};
 function syncQuality(){var levels=biz.qualityLevels(),key=JSON.stringify(levels);if(key!==lastLevels){lastLevels=key;quality.textContent='';var auto=document.createElement('option');auto.value=-1;auto.textContent=levels.length>1?'自动（按网络调整）':'原始画质（单一片源）';quality.appendChild(auto);if(levels.length>1)levels.forEach(function(l){var o=document.createElement('option');o.value=l.index;o.textContent=(l.height?l.height+'p':'档位 '+(l.index+1))+(l.bitrate?' · '+(l.bitrate/1e6).toFixed(1)+' Mbps':'');quality.appendChild(o);});quality.disabled=levels.length<2;}quality.value=String(levels.length>1?biz.qualityLevel():-1);$('mobile-quality-info').textContent=video.videoWidth?'当前解码：'+video.videoWidth+' × '+video.videoHeight+'；分辨率不等于片源画质':'连接后显示实际解码尺寸';}
 quality.onchange=function(){if(!biz.chooseQuality(Number(quality.value)))$('mobile-quality-info').textContent='该来源暂不支持切换清晰度';};
 $('mobile-report-ad').onclick=function(){biz.reportAd();adLabel();};
 function adLabel(){$('mobile-report-ad').hidden=player.classList.contains('live-mode');$('mobile-report-ad').textContent=biz.adReported()?'取消“此版本有广告”标记':'此版本有广告，降低推荐顺序';}
 window.StarlightAV={read:function(mode){if(mode==='volume'){syncVolume();return Number(volume.value);}return lightMode==='auto'&&native&&native.brightnessValue?native.brightnessValue():Number(light.value);},set:function(mode,value){var control=mode==='brightness'?light:volume;control.value=value;control.oninput();}};
 function sync(){syncVolume();syncQuality();adLabel();}
 new MutationObserver(function(){clearInterval(syncTimer);if(!panel.hidden){sync();syncTimer=setInterval(sync,1200);}}).observe(panel,{attributes:true,attributeFilter:['hidden']});
 new MutationObserver(setBrightness).observe(player,{attributes:true,attributeFilter:['hidden']});
 video.addEventListener('loadedmetadata',syncQuality);video.addEventListener('resize',syncQuality);syncVolume();syncQuality();
})();
