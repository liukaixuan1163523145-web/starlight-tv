(function(root){'use strict';
function create(storage){var entries={},pending={},ttl=604800000,retry=900000;
try{var saved=JSON.parse(storage.getItem('tv-recommendation-data')||'{}');if(saved.version===2)entries=saved.entries||{};}catch(e){}
function save(){var keys=Object.keys(entries).sort(function(a,b){return entries[b].savedAt-entries[a].savedAt;});keys.slice(120).forEach(function(k){delete entries[k];});var payload=JSON.stringify({version:2,entries:entries});while(payload.length>1800000&&keys.length>1){delete entries[keys.pop()];payload=JSON.stringify({version:2,entries:entries});}try{storage.setItem('tv-recommendation-data',payload);}catch(e){/* existing cached feeds remain usable */}}
function decorated(entry,local){var data=Object.assign({},entry.data);data.localCache=local;data.stale=Date.now()-entry.savedAt>=ttl||!!data.stale;return data;}
function update(key,loader){if(pending[key])return pending[key];var previous=entries[key];if(previous){previous.lastAttempt=Date.now();save();}pending[key]=Promise.resolve().then(loader).then(function(data){if(!data||!Array.isArray(data.items))throw Error('Invalid recommendation data');entries[key]={data:data,savedAt:data.fetchedAt||Date.now(),lastAttempt:Date.now()};save();return decorated(entries[key],false);}).then(function(data){delete pending[key];return data;},function(e){delete pending[key];throw e;});return pending[key];}
return {get:function(key,loader){var old=entries[key];if(old&&old.data&&Array.isArray(old.data.items)){if((Date.now()-old.savedAt>=ttl&&Date.now()-(old.lastAttempt||0)>=retry)||(/^\/api\/mdblist\?/.test(key)&&Date.now()-(old.lastAttempt||0)>=60000))update(key,loader).catch(function(){});return Promise.resolve(decorated(old,true));}return update(key,loader);}};
}
root.TVRecommendationCache={create:create};
})(window);
