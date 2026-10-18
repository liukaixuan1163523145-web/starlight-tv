// Feeds remain offline. Artwork checks bundled/downloaded caches first and fills misses once.
function cover(url,online){if(!/^https?:\/\//.test(url||''))return '';if(online===undefined)online=view==='results'||view==='detail'||view==='history';return '/api/poster?url='+encodeURIComponent(url)+(online?'&source=1':'');}
function mobilePoster(img,item,primary){
 var urls=[primary,item.cover,item.pic].concat((item.records||[]).map(function(r){return r.pic;})).filter(function(u,i,a){return /^https?:\/\//.test(u||'')&&a.indexOf(u)===i;}).slice(0,4),index=0;
 img.alt='';img.loading='lazy';img.decoding='async';
 function next(){if(index>=urls.length){img.removeAttribute('src');img.hidden=true;var parent=img.parentNode;if(parent&&!parent.querySelector('.poster-missing')){var label=el('span','poster-missing',(item.title||item.name||'')+' · 海报暂缺');parent.appendChild(label);}return;}img.src=cover(urls[index++],true);}
 img.onerror=next;next();
}
