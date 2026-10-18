const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const calls=[],player={hidden:true},button={setAttribute:(k,v)=>button[k]=v};let changed;
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../mobile/fullscreen.js'),'utf8'),{
 window:{StarlightAndroid:{fullscreen:value=>calls.push(value)}},
 document:{getElementById:id=>id==='player'?player:button,addEventListener(){}},
 MutationObserver:class{constructor(fn){changed=fn}observe(){}}
});
assert.deepEqual(calls,[false]);player.hidden=false;changed();assert.deepEqual(calls,[false,true]);assert.equal(button['aria-label'],'退出全屏');
button.onclick();assert.equal(calls.at(-1),false);changed();assert.equal(calls.length,3,'Same visibility (next episode) preserves manual exit');
player.hidden=true;changed();assert.equal(calls.at(-1),false);player.hidden=false;changed();assert.equal(calls.at(-1),true,'New playback enters fullscreen again');
player.hidden=true;changed();assert.equal(button['aria-label'],'全屏');
const report={passed:true,checks:['page reload restores normal UI','opening playback enters fullscreen','manual toggle updates label','same visibility does not undo manual choice','return restores system bars','next playback enters fullscreen again'],nativeDeviceVerified:false};
fs.writeFileSync(require('./test-report.cjs')('beta8-fullscreen-tests.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
