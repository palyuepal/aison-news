// Independent, read-only publication watchdog. Never writes repository content.
const SITE = 'https://aison.hk/';
const RAW = 'https://raw.githubusercontent.com/palyuepal/aison-news/main/';
const ARTIFACTS = ['data/latest.js','data/editorial.js','index.html','daily.html'];
const MAX_BYTES = 1024 * 1024;
// A matching public feed can still be editorially stale. Alert when the newest verified active item is over 24h old.
const MAX_LIVE_AGE_MS = 24 * 3600000;
export function editionClock(now = new Date()) {
  const hk = new Date(now.getTime() + 8 * 3600000);
  const calendar = hk.toISOString().slice(0,10);
  const minutes = hk.getUTCHours()*60 + hk.getUTCMinutes();
  return {calendar, due: new Date(hk.getTime()-(minutes<480?86400000:0)).toISOString().slice(0,10), grace:minutes>=480 && minutes<555};
}
export function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',') + '}';
  return JSON.stringify(value);
}
export function payload(text, variable) {
  const prefix = 'window.'+variable;
  const match = text.match(/^\s*window\.([A-Z_]+)\s*=\s*([\s\S]+?);?\s*$/);
  if (!match || match[1]!==variable) throw new Error('Invalid '+prefix+' payload');
  return JSON.parse(match[2]);
}
async function boundedText(url, fetcher) {
  const res = await fetcher(url, {headers:{'Cache-Control':'no-cache','User-Agent':'AIson-independent-watchdog/1.0'},signal:AbortSignal.timeout(15000)});
  if (!res.ok) { const e=new Error(new URL(url).pathname+' HTTP '+res.status); e.status=res.status; throw e; }
  const reader=res.body.getReader(); const chunks=[]; let size=0;
  try { while(true) {const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_BYTES)throw new Error('Response exceeds monitor limit');chunks.push(value);} }
  finally {await reader.cancel();}
  const bytes=new Uint8Array(size);let pos=0;for(const part of chunks){bytes.set(part,pos);pos+=part.byteLength;}
  return new TextDecoder().decode(bytes);
}
async function sha(text) {return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
export async function inspect(now=new Date(),fetcher=fetch) {
  const clock=editionClock(now); const stamp=now.getTime();
  const read = url=>boundedText(url+(url.includes('?')?'&':'?')+'watch='+stamp,fetcher);
  const result={checkedAt:now.toISOString(),dueEdition:clock.due,edition:null,state:'failed',checks:[],errors:[]};
  try {
    const receipt=JSON.parse(await read(SITE+'data/publication.json'));
    const yesterday = new Date(Date.parse(clock.calendar+'T00:00:00Z')-86400000).toISOString().slice(0,10);
    const preparing = clock.grace && receipt.editionDate===yesterday;
    if (receipt.editionDate !== clock.due && !preparing) throw new Error('Public edition '+receipt.editionDate+'; expected '+clock.due);
    const edition=receipt.editionDate;
    result.edition=receipt.editionDate;result.commit=receipt.commitSha;
    if (!/^[0-9a-f]{40}$/.test(receipt.commitSha||'')) throw new Error('Missing publication commit');
    if (canonical(Object.keys(receipt.artifacts||{}).sort())!==canonical([...ARTIFACTS].sort())) throw new Error('Missing artifact hashes');
    const texts={};
    // Keep simultaneous outgoing connections below platform limits.
    for (const group of [ARTIFACTS.slice(0,2),ARTIFACTS.slice(2)]) {
      await Promise.all(group.map(async path=>{texts[path]=await read(SITE+path);if(await sha(texts[path])!==receipt.artifacts[path])throw new Error('Public hash mismatch: '+path);}));
    }
    result.checks.push('public-artifacts');
    const rows=payload(texts['data/latest.js'],'AISON_NEWS');
    const editorial=payload(texts['data/editorial.js'],'AISON_EDITORIAL');
    if (!Array.isArray(rows)||!rows.length||rows.length>10||rows.length!==receipt.storyCount) throw new Error('Invalid story count');
    if (new Set(rows.map(x=>x.id)).size!==rows.length||canonical(rows.map(x=>x.rank).sort((a,b)=>a-b))!==canonical(rows.map((_,i)=>i+1))) throw new Error('Invalid IDs/ranks');
    if (rows.some(x=>x.date!==edition||x.verified!==true)) throw new Error('Invalid story date/verification');
    if (editorial.date!==edition||canonical(editorial.top3Ids)!==canonical(receipt.top3Ids)||editorial.top3Ids.some(id=>!rows.some(r=>r.id===id))) throw new Error('Editorial mismatch');
    result.checks.push('daily-editorial');
    const sources = await Promise.all(['daily','editorial'].map(kind=>read(RAW+'content/'+kind+'/'+edition+'.json').then(JSON.parse)));
    const [source,meta]=sources;
    if (source.length!==rows.length||source.some(r=>!rows.some(pub=>pub.id===r.id&&Object.keys(r).every(k=>canonical(r[k])===canonical(pub[k]))))) throw new Error('main DAILY differs from public');
    if (Object.keys(meta).some(k=>canonical(meta[k])!==canonical(editorial[k]))) throw new Error('main editorial differs from public');
    const [liveSource,livePublic]=await Promise.all([read(RAW+'content/live.json').then(JSON.parse),read(SITE+'data/live.js').then(t=>payload(t,'AISON_LIVE'))]);
    if (canonical(liveSource)!==canonical(livePublic)) throw new Error('main LIVE differs from public');
    if (!Array.isArray(liveSource)) throw new Error('Invalid LIVE feed');
    const currentItems=liveSource.filter(item=>item.active===true && item.verified===true);
    const publishedTimes=currentItems.map(item=>Date.parse(item.publishedAt));
    if (!publishedTimes.length || publishedTimes.some(time=>!Number.isFinite(time))) throw new Error('No valid active verified LIVE items');
    const latest=Math.max(...publishedTimes);
    const ageMs=now.getTime()-latest;
    result.latestLiveAt=new Date(latest).toISOString();
    result.liveAgeHours=Math.round(ageMs/360000)/10;
    if (ageMs>MAX_LIVE_AGE_MS) throw new Error('LIVE editorial freshness overdue: latest '+result.latestLiveAt+' ('+result.liveAgeHours+'h old). Content matches main but needs a verified new LIVE scan; redeploying stale sources will not help.');
    result.checks.push('main-source','live-source','live-freshness');result.state=preparing?'preparing':'healthy';
  } catch(error) {result.errors.push(error instanceof Error?error.message:String(error));}
  return result;
}
export async function processTick(env,now=new Date(),fetcher=fetch,notify=async()=>false) {
  const previous=await env.MONITOR_STATE.get('status',{type:'json'});
  const current=await inspect(now,fetcher);
  current.failures=current.state==='failed'?(previous?.failures||0)+1:0;
  current.alertState=env.ALERT_TO?'configured':'not-configured';
  current.lastNotification=previous?.lastNotification||null;
  const incident=current.state==='failed'&&current.failures>=2;
  const recovering=current.state==='healthy'&&(previous?.incidentOpen||previous?.recoveryPending);
  current.recoveryPending=Boolean(recovering);
  const repeatDue=!previous?.lastNotification||now.getTime()-Date.parse(previous.lastNotification)>=6*3600000;
  current.incidentOpen=incident||Boolean(previous?.incidentOpen&&current.state!=='healthy');
  if ((incident&&(!previous?.incidentOpen||repeatDue))||recovering) {
    try {
      const sent=await notify(current,recovering);
      if(sent){current.lastNotification=now.toISOString();current.recoveryPending=false;}
      else current.alertState='not-configured';
    }catch(error){current.alertState='delivery-failed';current.alertError=String(error);}
  }
  // Only scheduled events write, so public reads cannot trigger work or emails.
  await env.MONITOR_STATE.put('status',JSON.stringify(current));
  console.log(JSON.stringify({event:'publication-monitor',...current}));
  if(current.alertState==='delivery-failed')throw new Error('Independent alert delivery failed');
  return current;
}
export default {
  async scheduled(controller,env,ctx) {
    await processTick(env,new Date(controller.scheduledTime),fetch,async (state,recovered)=>{
      if(!env.ALERT_TO||!env.ALERT_FROM||!env.ALERT_EMAIL)return false;
      await env.ALERT_EMAIL.send({to:env.ALERT_TO,from:env.ALERT_FROM,subject:recovered?'AIson 發布已恢復':'AIson 發布異常',
        text:'香港版本：'+state.dueEdition+'\n核對時間：'+state.checkedAt+'\n狀態：'+state.state+'\n'+state.errors.join('\n')+'\nhttps://aison.hk/\nhttps://github.com/palyuepal/aison-news/actions'});
      return true;
    });
  },
  async fetch(request,env) {
    if(request.method!=='GET'||new URL(request.url).pathname!=='/health')return new Response('Not found',{status:404});
    const state=await env.MONITOR_STATE.get('status',{type:'json'});
    const stale=!state||Date.now()-Date.parse(state.checkedAt)>12*60000;
    return Response.json({state:stale?'monitor-stale':state.state,checkedAt:state?.checkedAt||null,edition:state?.edition||null,alertState:state?.alertState||'not-configured'},
      {status:!stale&&state.state==='healthy'?200:503,headers:{'Cache-Control':'no-store'}});
  }
};
