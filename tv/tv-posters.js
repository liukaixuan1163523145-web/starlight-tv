// Recommendation feeds stay offline. Search/detail/history may fill artwork misses.
var tvPosterHints={};
function tvPosterKey(item){return window.StarlightVersions.base(item.title||item.name||'')+'|'+String(item.year||'');}
function cover(url,online){if(!/^https?:\/\//.test(url||''))return '';if(online===undefined)online=view==='results'||view==='detail'||view==='history';return '/api/poster?url='+encodeURIComponent(url)+(online?'&source=1':'');}
function tvPoster(img,item,primary){
 var online=view==='results'||view==='detail'||view==='history',key=tvPosterKey(item);
 if(!online&&/^https?:\/\//.test(primary||'')){
  delete tvPosterHints[key];tvPosterHints[key]=primary;
  var keys=Object.keys(tvPosterHints);keys.slice(0,Math.max(0,keys.length-500)).forEach(function(k){delete tvPosterHints[k];});
 }
 var urls=[tvPosterHints[key],primary,item.cover,item.pic].concat((item.records||[]).map(function(r){return r.pic;})).filter(function(u,i,a){return /^https?:\/\//.test(u||'')&&a.indexOf(u)===i;}).slice(0,6),index=0,fill=false;
 img.alt='';
 function next(){
  if(index>=urls.length&&online&&!fill){fill=true;index=0;}
  if(index>=urls.length){img.removeAttribute('src');img.hidden=true;var parent=img.parentNode;if(parent&&!parent.querySelector('.poster-missing'))parent.appendChild(el('span','poster-missing',(item.title||item.name||'')+' · 海报暂缺'));return;}
  // Read all known cached candidates before downloading a missing source image.
  img.src=cover(urls[index++],fill);
 }
 img.onerror=next;next();
}
