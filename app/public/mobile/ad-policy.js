(function(root){
 'use strict';
 function classify(text,confidence,darkRatio){
  var clean=String(text||'').replace(/\s+/g,'').toLowerCase();
  var words=['博彩','赌博','棋牌','真人娱乐','捕鱼','赌场','体育投注'];
  var hits=words.filter(function(w){return clean.indexOf(w)>=0;});
  var promo=/赞助发布|赞助发行|主营|开户注册|注册送|充值|送彩金|送彩金|官方直营|备用网址/.test(clean);
  var domain=/(?:[a-z0-9-]+\.)+(?:com|net|vip|cc|bet|club|top|xyz)\b/i.test(clean);
  // OCR often loses the sponsor line over moving backgrounds. A casino-service
  // phrase plus another gambling category and a URL can still justify a local mask.
  // Keep the stricter sponsor requirement for automatic seeking.
  var commercial=hits.indexOf('真人娱乐')>=0||hits.indexOf('体育投注')>=0;
  var strong=confidence>=45&&hits.length>=2&&promo&&domain;
  var partial=confidence>=55&&hits.length>=2&&commercial&&domain;
  return {suspected:strong||partial,fullScreen:strong&&darkRatio>=.82,hits:hits,promo:promo,domain:domain};
 }
 var api={classify:classify};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.StarlightAdPolicy=api;
})(typeof window==='object'?window:this);
