const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context={view:'home',el:(tag,cls,text)=>({tag,cls,text})};
vm.runInNewContext(fs.readFileSync(require.resolve('../mobile/posters.js'),'utf8'),context);
function image(){const labels=[];return {labels,parentNode:{querySelector:()=>labels[0],appendChild:l=>labels.push(l)},removeAttribute(name){delete this[name];}};}
const first='https://img9.doubanio.com/view/photo/s_ratio_poster/public/p2934583425.jpg';
const img=image();context.mobilePoster(img,{title:'年会不能停！2',cover:first},first,false);
assert.equal(new URL(img.src,'http://localhost').searchParams.get('source'),'1','Home artwork may fill a missing local cache entry');
assert.equal(new URL(img.src,'http://localhost').searchParams.get('url'),first);
const fallback=image();context.mobilePoster(fallback,{name:'影片',records:[{pic:'https://example.com/a.jpg'},{pic:'https://example.com/b.jpg'}]},'https://example.com/a.jpg');
fallback.onerror();assert.equal(new URL(fallback.src,'http://localhost').searchParams.get('url'),'https://example.com/b.jpg');
fallback.onerror();assert.equal(fallback.hidden,true);assert.equal(fallback.labels.length,1);assert.match(fallback.labels[0].text,/影片/);
const absent=image();context.mobilePoster(absent,{name:'无图片影片'},'');assert.equal(absent.labels.length,1);
assert.equal(context.cover(first,false).includes('source=1'),false,'Explicit offline API callers remain offline');
console.log('Mobile poster regression passed: home cache fill, fallback URL, named placeholder, explicit offline mode.');
