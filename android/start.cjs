'use strict';
const fs = require('fs'), path = require('path');
const data = process.env.TV_DATA_DIR;
if (!data) throw new Error('Missing private app directory');
const config = JSON.parse(fs.readFileSync(path.join(data, 'server-config.json'), 'utf8'));
const edition = JSON.parse(fs.readFileSync(path.join(__dirname, 'edition.json'), 'utf8'));
if (edition.localOnly) process.env.RECOMMEND_LOCAL_ONLY = '1';
for (const key of ['PASSWORD','DEFAULT_SOURCES','MDBLIST_API_KEY','SEARCH_MAX_PAGES','SEARCH_SOURCE_TIMEOUT_MS']) {
  if (config[key] !== undefined) process.env[key] = String(config[key]);
}
if (edition.localOnly) delete process.env.MDBLIST_API_KEY;
Object.assign(process.env, {
  HOSTNAME:'127.0.0.1', PORT:'8080', NODE_ENV:'production', NEXT_TELEMETRY_DISABLED:'1',
  MDBLIST_CACHE_DIR:path.join(data,'data/mdblist-cache'),
  RECOMMEND_CACHE_DIR:path.join(data,'data/recommendation-cache')
});
process.chdir(path.join(__dirname,'app'));
require('./app/server.js');
