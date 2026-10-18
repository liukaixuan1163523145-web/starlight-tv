(function(root){'use strict';
 var suffix=/(?:\s*[（(【\[]?\s*)(国语|粤语|普通话|国粤双语|英语|日语|韩语|原声|原音|中文配音|中文|中配|日文|英文|韩文)(?:配音)?(?:版)?\s*[）)】\]]?$/;
 function base(t){return String(t||'').normalize('NFKC').replace(suffix,'').trim();}
 function language(r){var m=suffix.exec(String(r.name||r.title||'').normalize('NFKC'));return m?m[1]:String(r.language||'').trim();}
 function priority(r){
  var l=language(r),area=String(r.area||'');if(!l)return 0;if(/原声|原音/.test(l))return 20;
  // Metadata is only a preference hint, never proof of the actual audio track.
  if(/双语|多语|国语.*英语|英语.*国语|普通话.*英语|英语.*普通话/.test(l))return 0;
  var regions=[[/日本/,/日语|日文/],[/韩国/,/韩语|韩文/],[/美国|英国|澳大利亚|新西兰/,/英语|英文/],[/法国/,/法语/],[/德国|奥地利/,/德语/],[/西班牙/,/西班牙语/],[/泰国/,/泰语/],[/香港|澳门/,/粤语/],[/中国|大陆|内地|台湾/,/国语|普通话|汉语|中文/]];
  var matches=regions.filter(function(x){return x[0].test(area);});
  if(matches.length===1)return matches[0][1].test(l)?10:-10;
  if(matches.length>1)return 0;
  if(/国语|普通话|中文|中配|粤语/.test(l))return -10;
  return /英语|英文|日语|日文|韩语|韩文|法语|德语|西班牙|泰语/.test(l)?10:0;
 }
 function label(r){var l=language(r);return l?'语言：'+l+'（源标注）':'语言未标注';}
 root.StarlightVersions={base:base,language:language,priority:priority,label:label};
})(window);
