// PoC build step: downlevel client-only bundles including precompiled dependencies.
// Run after next build and before packaging; clear the probe's WebView cache on release changes.
const fs=require('fs'),path=require('path'),esbuild=require('esbuild'),acorn=require('acorn');
let checked=0,changed=0;
function visit(dir){
 for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  const file=path.join(dir,entry.name);
  if(entry.isDirectory()){visit(file);continue;}
  if(!file.endsWith('.js'))continue;
  const source=fs.readFileSync(file,'utf8');
  let compatible=true;
  try{acorn.parse(source,{ecmaVersion:2018,sourceType:'script'});}catch{compatible=false;}
  if(!compatible){
   const out=esbuild.transformSync(source,{target:'chrome66',supported:{'optional-catch-binding':false},minify:true,legalComments:'inline',charset:'utf8'}).code;
   acorn.parse(out,{ecmaVersion:2018,sourceType:'script'});
   fs.writeFileSync(file,out);changed++;
  }
  checked++;
 }
}
visit('.next/static/chunks');
console.log(JSON.stringify({checked,downleveled:changed,parser:'ECMAScript 2018',target:'Chrome 66'}));
