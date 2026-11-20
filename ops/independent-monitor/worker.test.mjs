import {test} from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import worker,{editionClock,canonical,inspect,processTick} from './worker.mjs';
globalThis.crypto ||= webcrypto;
const now=new Date('2026-11-20T02:00:00Z');
const row={id:'one',rank:1,date:'2026-11-20',title:'Verified item',verified:true};
const meta={date:row.date,top3Ids:[row.id]};
const live=[{id:'live',summary:'correct facts',active:true,verified:true,publishedAt:'2026-11-19T22:00:00Z'}];
async function fixture(tamper=''){
 const files={'data/latest.js':'window.AISON_NEWS = '+JSON.stringify([row])+';',
 'data/editorial.js':'window.AISON_EDITORIAL = '+JSON.stringify(meta)+';',
 'index.html':'home','daily.html':'daily'};
 const artifacts={};for(const [name,text]of Object.entries(files))artifacts[name]=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(x=>x.toString(16).padStart(2,'0')).join('');
 const receipt={editionDate:row.date,storyCount:1,top3Ids:meta.top3Ids,commitSha:'a'.repeat(40),artifacts};
 const urls=new Map(Object.entries(files).map(([p,v])=>['https://aison.hk/'+p,v]));
 urls.set('https://aison.hk/data/publication.json',JSON.stringify(receipt));
 urls.set('https://aison.hk/data/live.js','window.AISON_LIVE = '+JSON.stringify(tamper==='live'?[{...live[0],summary:'old facts'}]:live)+';');
 const root='https://raw.githubusercontent.com/palyuepal/aison-news/main/content/';
 urls.set(root+'daily/'+row.date+'.json',JSON.stringify([row]));urls.set(root+'editorial/'+row.date+'.json',JSON.stringify(meta));urls.set(root+'live.json',JSON.stringify(live));
 if(tamper==='html')urls.set('https://aison.hk/index.html','outdated');
 return async url=>{const key=url.split('?')[0];return urls.has(key)?new Response(urls.get(key)):new Response('missing',{status:404});};
}
function kv(){const values=new Map();return {async get(k){return values.has(k)?JSON.parse(values.get(k)):null},async put(k,v){values.set(k,v)}};}
test('Hong Kong due date and deadline grace',()=>{
 assert.equal(editionClock(new Date('2026-11-19T23:59Z')).due,'2026-11-19');
 assert.equal(editionClock(new Date('2026-11-20T00:00Z')).due,'2026-11-20');
 assert.equal(editionClock(new Date('2026-11-20T01:14Z')).grace,true);
 assert.equal(editionClock(new Date('2026-11-20T01:15Z')).grace,false);
});
test('strict JS payload parser never evaluates code',async()=>{
 const {payload}=await import('./worker.mjs');assert.throws(()=>payload('window.AISON_NEWS = process.exit();','AISON_NEWS'));
});
test('healthy source and final public artifact hashes',async()=>assert.equal((await inspect(now,await fixture())).state,'healthy'));
test('reject outdated HTML and LIVE corrections',async()=>{
 for(const variant of ['html','live'])assert.equal((await inspect(now,await fixture(variant))).state,'failed');
});
test('stale LIVE source cannot report healthy even when it matches the public feed',async()=>{
 const checkedAt=new Date('2026-11-20T23:59:00Z');
 const result=await inspect(checkedAt,await fixture());
 assert.equal(result.state,'failed');
 assert.equal(result.latestLiveAt,'2026-11-19T22:00:00.000Z');
 assert.ok(result.errors.some(message=>message.includes('editorial freshness overdue')));
 assert.ok(result.liveAgeHours>=26);
});
test('a recent matching LIVE source remains healthy',async()=>{
 const result=await inspect(now,await fixture());
 assert.equal(result.state,'healthy');
 assert.equal(result.checks.includes('live-freshness'),true);
});
test('network failures cannot report success',async()=>assert.equal((await inspect(now,async()=>{throw Error('offline')})).state,'failed'));
test('two failed observations alert, no repeated spam, recovery notifies',async()=>{
 const env={MONITOR_STATE:kv(),ALERT_TO:'configured'};const events=[];const notify=async(s,recovery)=>{events.push(recovery);return true};
 const bad=await fixture('live');await processTick(env,now,bad,notify);assert.equal(events.length,0);
 await processTick(env,new Date(+now+300000),bad,notify);assert.deepEqual(events,[false]);
 await processTick(env,new Date(+now+600000),bad,notify);assert.deepEqual(events,[false]);
 await processTick(env,new Date(+now+900000),await fixture(),notify);assert.deepEqual(events,[false,true]);
});
test('public health reads never execute checks or send emails and detect stopped monitor',async()=>{
 const env={MONITOR_STATE:kv()};assert.equal((await worker.fetch(new Request('https://watch/health'),env)).status,503);
 await env.MONITOR_STATE.put('status',JSON.stringify({state:'healthy',checkedAt:new Date(Date.now()-13*60000).toISOString()}));
 assert.equal((await worker.fetch(new Request('https://watch/health'),env)).status,503);
 assert.equal((await worker.fetch(new Request('https://watch/run',{method:'POST'}),env)).status,404);
});
test('failed recovery email remains pending and retries on next healthy tick',async()=>{
 const env={MONITOR_STATE:kv(),ALERT_TO:'configured'};
 await env.MONITOR_STATE.put('status',JSON.stringify({incidentOpen:true,failures:2,lastNotification:now.toISOString()}));
 await assert.rejects(processTick(env,now,await fixture(),async()=>{throw Error('mail unavailable')}));
 assert.equal((await env.MONITOR_STATE.get('status')).recoveryPending,true);
 let sent=0;await processTick(env,new Date(+now+300000),await fixture(),async(s,recovery)=>{assert.equal(recovery,true);sent++;return true});
 assert.equal(sent,1);assert.equal((await env.MONITOR_STATE.get('status')).recoveryPending,false);
});
