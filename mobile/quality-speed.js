(function(root){'use strict';
function create(options){var storage=options.storage,request=options.fetch,entries={},controller=null,serial=0;
try{entries=JSON.parse(storage.getItem('mobile-source-quality-v1')||'{}');}catch(e){}
function get(key){var e=entries[key];return e&&Date.now()-e.at<(e.ok?3600000:600000)?e:null;}
function save(key,value){entries[key]=value;var keys=Object.keys(entries).sort(function(a,b){return entries[b].at-entries[a].at;});keys.slice(240).forEach(function(k){delete entries[k];});try{storage.setItem('mobile-source-quality-v1',JSON.stringify(entries));}catch(e){}}
function cancel(){serial++;if(controller)controller.abort();controller=null;}
function proxy(url,live){if(/^\/api\/(proxy|live\/stream)\?url=/.test(url))return url;if(/^https?:\/\//.test(url))return (live?'/api/live/stream?url=':'/api/proxy?url=')+encodeURIComponent(url);throw Error('不支持的媒体地址');}
async function read(url,live,limit,signal){var started=performance.now(),r=await request(proxy(url,live),{credentials:'same-origin',cache:'no-store',signal:signal,headers:{Range:'bytes=0-'+(limit-1)}});if(!r.ok)throw Error('HTTP '+r.status);var connected=performance.now();if(!r.body||!r.body.getReader)throw Error('当前播放器不支持流测速');var reader=r.body.getReader(),chunks=[],size=0;try{while(size<limit){var part=await reader.read();if(part.done)break;var chunk=part.value.slice(0,limit-size);chunks.push(chunk);size+=chunk.length;}}finally{await reader.cancel().catch(function(){});}var data=new Uint8Array(size),offset=0;chunks.forEach(function(c){data.set(c,offset);offset+=c.length;});return {bytes:data,ms:Math.max(1,performance.now()-started),connectMs:connected-started};}
function resolve(uri,current){if(/^\/api\/(proxy|live\/stream)\?url=/.test(uri))return uri;var original=current;if(/^\/api\//.test(current))original=new URL(current,location.origin).searchParams.get('url');return new URL(uri,original).href;}
async function probe(url,live,signal){var current=url,started=performance.now(),declaredHeight=0,declaredBandwidth=0;for(var depth=0;depth<4;depth++){
 var result=await read(current,live,131072,signal),text=new TextDecoder('utf-8').decode(result.bytes).replace(/^\uFEFF/,'');if(text.indexOf('#EXTM3U')!==0)throw Error('未返回播放列表');var lines=text.split(/\r?\n/).map(function(x){return x.trim();}),streams=[];
 for(var i=0;i<lines.length;i++){if(lines[i].indexOf('#EXT-X-STREAM-INF:')===0){var height=Number((/RESOLUTION=\d+x(\d+)/.exec(lines[i])||[])[1]||0);var j=i+1;while(j<lines.length&&(!lines[j]||lines[j][0]==='#'))j++;if(lines[j])streams.push({height:height,bandwidth:Number((/(?:^|[:,])(?:AVERAGE-)?BANDWIDTH=(\d+)/.exec(lines[i])||[])[1]||0),url:lines[j]});}}
 if(streams.length){var suitable=streams.filter(function(s){return s.height<=1080;});if(suitable.length)streams=suitable;streams.sort(function(a,b){return suitable.length?b.height-a.height:a.height-b.height;});declaredHeight=streams[0].height;declaredBandwidth=streams[0].bandwidth;current=resolve(streams[0].url,current);continue;}
 var media=lines.filter(function(x){return x&&x[0]!=='#';});if(!media.length)throw Error('空播放列表');var indices=live?[Math.max(0,media.length-2)]:[0,Math.min(10,Math.floor(media.length/2))],samples=[];
 for(var n=0;n<indices.length;n++){if(n&&indices[n]===indices[n-1])continue;var segment=resolve(media[indices[n]],current),sample=await read(segment,live,262144,signal),head=new TextDecoder('utf-8').decode(sample.bytes.slice(0,64));if(sample.bytes.length<16384||/^\s*(<|\{)/.test(head))throw Error('未取得有效媒体片段');samples.push({mbps:Number((sample.bytes.length*8/sample.ms/1000).toFixed(2)),connectMs:Math.round(sample.connectMs),bytes:sample.bytes.length});}
 var rates=samples.map(function(s){return s.mbps;}),low=Math.min.apply(null,rates),high=Math.max.apply(null,rates);
 return {ok:true,at:Date.now(),mbps:low,peakMbps:high,connectMs:Math.max.apply(null,samples.map(function(s){return s.connectMs;})),totalMs:Math.round(performance.now()-started),bytes:samples.reduce(function(sum,s){return sum+s.bytes;},0),samples:samples.length,declaredHeight:declaredHeight,declaredBandwidth:declaredBandwidth,variation:high?1-low/high:0};
 }throw Error('播放列表层级过多');}
async function run(jobs,onResult,force){cancel();var token=serial;for(var i=0;i<jobs.length;i++){if(token!==serial)break;var job=jobs[i],cached=!force&&get(job.key);if(cached){onResult(job,cached);continue;}
 controller=new AbortController();var current=controller,timeout=false,timer=setTimeout(function(){timeout=true;current.abort();},16000);
 try{var url=await job.url(current.signal);if(token!==serial)break;var value=await probe(url,!!job.live,current.signal);if(token!==serial)break;save(job.key,value);onResult(job,value);}catch(e){if(token!==serial)break;var failure={ok:false,at:Date.now(),error:timeout?'测速超时':'暂不可测'};save(job.key,failure);onResult(job,failure);}finally{clearTimeout(timer);if(controller===current)controller=null;}
 }}
function score(e){if(!e)return -20;if(!e.ok)return -100;return Math.round(40+Math.min(25,e.mbps*3)+Math.max(0,15-e.connectMs/200)-Math.min(15,(e.variation||0)*15));}
function label(e){return !e?'待测速':e.ok?e.mbps.toFixed(1)+' Mbps · '+(e.samples||1)+' 点抽测':e.error;}
return {get:get,run:run,cancel:cancel,label:label,score:score};}
root.TVSpeed={create:create};
})(window);
