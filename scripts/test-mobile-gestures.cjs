const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
let events={},values={brightness:50,volume:40},hud,now=1000,closed=0;
const videoTarget={closest:()=>null},controlTarget={closest:()=>({})},panelTarget={inside:true};
const panel={hidden:true,contains:t=>!!t.inside},selection={hidden:true};
const player={hidden:false,appendChild:n=>hud=n,addEventListener:(n,f)=>events[n]=f,getBoundingClientRect:()=>({left:0,width:1000,height:500}),setPointerCapture(){},releasePointerCapture(){}};
const scope={window:{StarlightAV:{read:m=>values[m],set:(m,v)=>values[m]=v}},document:{getElementById:id=>({'player':player,'mobile-panel':panel,'mobile-mask-select':selection,'mobile-panel-close':{click(){panel.hidden=true;closed++;}}}[id]),createElement:()=>({children:[],style:{},classList:{toggle(){},remove(){},add(){}},setAttribute(){},appendChild(n){this.children.push(n);}})},MutationObserver:class{observe(){}},setTimeout:()=>1,clearTimeout(){},Date:{now:()=>now},Math};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../mobile/gestures.js'),'utf8'),scope);
function event(x,y,target=videoTarget){return {clientX:x,clientY:y,target,pointerType:'touch',pointerId:1,isPrimary:true,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;}};}
function drag(x,dy,target){events.pointerdown(event(x,250,target));events.pointermove(event(x,250+dy,target));events.pointerup(event(x,250+dy,target));}
drag(100,-65);assert.equal(values.brightness,70);assert.equal(values.volume,40);assert.equal(hud.children[0].children[2].textContent,'70%');assert.equal(hud.children[0].children[1].children[0].style.height,'70%');assert.equal(hud.children[0].children[3].textContent,'左侧上下滑');
let click=event(100,185);events.click(click);assert(click.prevented,'Drag must not trigger click/double-seek');now+=500;
drag(800,65);assert.equal(values.volume,20);now+=500;
drag(800,-300,controlTarget);assert.equal(values.volume,20,'Progress/buttons excluded');selection.hidden=false;drag(100,100);assert.equal(values.brightness,70,'Mask selection excluded');selection.hidden=true;
panel.hidden=false;events.pointerdown(event(100,200));events.pointerup(event(100,200));assert(panel.hidden);assert.equal(closed,1);panel.hidden=false;events.pointerdown(event(100,200,panelTarget));events.pointerup(event(100,200,panelTarget));assert(!panel.hidden,'Inside panel stays open');
panel.hidden=true;events.pointerdown(event(100,200));events.pointermove(event(200,205));events.pointerup(event(200,205));assert.equal(values.brightness,70,'Horizontal swipe does not change brightness');
const report={passed:true,checks:['left vertical brightness','right vertical volume','drag does not click or double-seek','controls excluded','mask selection excluded','outside tap closes only panel','inside panel preserved','horizontal motion ignored'],physicalPhone:false};fs.writeFileSync(require('./test-report.cjs')('beta11-gesture-tests.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
