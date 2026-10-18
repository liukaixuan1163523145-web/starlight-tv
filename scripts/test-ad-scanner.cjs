// Exercise the real scanner lifecycle with a deterministic OCR worker and video clock.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const policy=require('../mobile/ad-policy.js');
function harness(){
 const nodes={},timers=new Map(),events={},logs=[];let id=0,calls=0;
 const sample={text:'本片由89495.com赞助发布 主营棋牌真人娱乐捕鱼',confidence:85,blocks:[{paragraphs:[{lines:[{text:'棋牌真人娱乐89495.com',bbox:{x0:100,y0:340,x1:600,y1:390}}]}]}]};
 function node(){return {hidden:false,textContent:'',value:'',style:{},classList:{contains:()=>false},appendChild(){},setAttribute(){},querySelector:()=>({}),getBoundingClientRect:()=>({left:0,top:0,width:1280,height:720}),addEventListener(name,fn){(this.events||(this.events={}))[name]=fn;}};}
 const video=node();Object.assign(video,{paused:false,seeking:false,readyState:4,videoWidth:1280,videoHeight:720,currentTime:2,duration:100});nodes.video=video;
 const document={hidden:false,head:{appendChild(){}},createElement(type){if(type==='canvas')return {getContext:()=>({drawImage(){},getImageData:()=>({width:1280,height:720,data:new Uint8ClampedArray(1280*720*4)})})};return node();},getElementById(name){return nodes[name]||(nodes[name]=node());},addEventListener(name,fn){events[name]=fn;}};
 const context={document,console:{info:(s)=>logs.push(s),warn:(s)=>logs.push(s)},localStorage:{getItem:()=>null,setItem(){}},StarlightAdPolicy:policy,location:{origin:'http://127.0.0.1'},MutationObserver:class{constructor(fn){this.fn=fn;}observe(){}},setTimeout(fn,ms){timers.set(++id,{fn,ms});return id;},clearTimeout(i){timers.delete(i);},Date,Math,isFinite,Promise};
 context.window={Tesseract:true,addEventListener(){},__starlightBack:()=>true};context.Tesseract={async createWorker(){return {async setParameters(){},async recognize(){calls++;return {data:sample};},terminate(){}};}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../mobile/ad-scanner.js'),'utf8'),context);
 return {video,nodes,events,logs,timers,sample,get calls(){return calls;},async tick(){assert.equal(timers.size,1);const [key,t]=[...timers][0];timers.delete(key);await t.fn();},emit(name){video.events[name]();}};
}
(async()=>{
 const h=harness();h.emit('playing');assert.equal([...h.timers.values()][0].ms,150,'Opening ad scanning starts promptly');await h.tick();assert.equal(h.calls,1);assert(h.logs.some(x=>x.startsWith('STARLIGHT_OCR_MASK ')));
 h.video.paused=true;h.emit('pause');await h.tick();assert.equal(h.calls,2,'Paused ad is scanned once');assert.equal(h.timers.size,0,'Paused frame does not scan continuously');
 h.video.currentTime=30;h.emit('seeked');await h.tick();assert.equal(h.calls,3,'Seek while paused scans new frame');assert.equal(h.timers.size,0);
 h.nodes['mobile-ad-mode'].value='auto';h.nodes['mobile-ad-mode'].onchange();await h.tick();assert.equal(h.video.currentTime,30,'Auto mode cannot seek paused playback');
 h.sample.text='正常剧情：请远离赌博';h.emit('seeked');await h.tick();assert.equal(h.nodes['mobile-ad-status'].textContent,'识别中 · 暂未发现明确广告');
 h.video.paused=false;h.emit('playing');await h.tick();assert.equal(h.timers.size,1,'Playing resumes repeated scanning');
 console.log('Scanner lifecycle passed: opening frame, pause once, paused seek, no paused auto-skip, negative frame, resume.');
})().catch(e=>{console.error(e);process.exitCode=1;});

