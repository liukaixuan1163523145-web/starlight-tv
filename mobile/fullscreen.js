(function(){'use strict';
 var player=document.getElementById('player'),button=document.getElementById('mobile-fullscreen'),native=window.StarlightAndroid,visible=false,immersive=false;
 function label(){button.setAttribute('aria-label',(native&&native.fullscreen?immersive:!!document.fullscreenElement)?'退出全屏':'全屏');}
 function set(enabled){
  immersive=enabled;
  if(native&&native.fullscreen){native.fullscreen(enabled);label();return;}
  if(enabled&&!document.fullscreenElement&&player.requestFullscreen){var p=player.requestFullscreen();if(p)p.catch(function(){immersive=false;label();});}
  else if(!enabled&&document.fullscreenElement){document.exitFullscreen().catch(function(){});}
  label();
 }
 button.onclick=function(){set(!(native&&native.fullscreen?immersive:!!document.fullscreenElement));};
 function sync(){var next=!player.hidden;if(next!==visible){visible=next;set(next);}}
 new MutationObserver(sync).observe(player,{attributes:true,attributeFilter:['hidden']});
 document.addEventListener('fullscreenchange',label);
 // Reset native state on page reload, then enter automatically when playback opens.
 set(false);sync();
})();
