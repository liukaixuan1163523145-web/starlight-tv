const assert=require('assert'),fs=require('fs'),vm=require('vm');
const scope={view:'home',window:{StarlightVersions:{base:s=>s}},el:(tag,cls,text)=>({tag,cls,text})};
vm.createContext(scope);vm.runInContext(fs.readFileSync(require.resolve('../tv/tv-posters.js'),'utf8'),scope);
function img(){const labels=[];return {labels,parentNode:{querySelector:()=>labels[0],appendChild:l=>labels.push(l)},removeAttribute(k){delete this[k];}};}
const a='https://posters.test/home.jpg',b='https://posters.test/source.jpg',c='https://posters.test/backup.jpg';
scope.tvPoster(img(),{title:'Film',year:'2026'},a);
scope.view='results';let p=img();scope.tvPoster(p,{name:'Film',year:'2026',records:[{pic:b}]},b);
assert.equal(new URL(p.src,'http://local').searchParams.get('url'),a,'Reuse known recommendation image');assert(!p.src.includes('source=1'),'Cached first');
p.onerror();assert.equal(new URL(p.src,'http://local').searchParams.get('url'),b);assert(!p.src.includes('source=1'));p.onerror();assert(p.src.includes('source=1'),'Fill only after cached candidates fail');
scope.view='detail';p=img();scope.tvPoster(p,{name:'Another',records:[{pic:b},{pic:c}]},b);p.onerror();assert(p.src.includes(encodeURIComponent(c)));p.onerror();assert(p.src.includes('source=1'));p.onerror();p.onerror();assert(p.hidden&&p.labels.length===1,'Bounded fallback with named placeholder');
p=img();scope.tvPoster(p,{name:'Film',year:'1999'},b);assert(!p.src.includes(encodeURIComponent(a)),'Do not borrow remake poster from different year');
scope.view='home';p=img();scope.tvPoster(p,{title:'Offline'},a);p.onerror();assert(p.hidden,'Offline recommendation does not trigger downloads');
scope.view='history';p=img();scope.tvPoster(p,{name:'Empty'},'');assert(p.hidden,'Missing URL terminates without a request');
console.log('TV posters: cached recommendation reuse, per-year match, search/detail fill, bounded fallback, offline home and missing URL passed');
