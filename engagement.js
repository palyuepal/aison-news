(() => {
  const $=(s,r=document)=>r.querySelector(s);
  const esc=(s='')=>String(s).replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));
  const short=(s='',limit=52)=>{const clean=String(s).replace(/\s+/g,' ').trim();return clean.length>limit?clean.slice(0,limit).replace(/[，。；、\s]+$/,'')+'…':clean};
  const fmtDate=value=>{try{return new Intl.DateTimeFormat('zh-HK',{year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value+'T00:00:00'))}catch{return value||''}};
  const NEWS=()=>Array.isArray(window.AISON_NEWS)?window.AISON_NEWS.slice().sort((a,b)=>(a.rank||99)-(b.rank||99)):[];
  const STATUS=()=>window.AISON_STATUS||{};
  const SITE=()=>window.AISON_SITE||{};
  const EDITORIAL=()=>window.AISON_EDITORIAL||{};
  const LAST_SEEN_KEY='aison-last-seen-edition-v1';
  const DAILY_URL='https://aison.hk/daily.html';

  function loadScript(src,id){
    if(document.getElementById(id))return Promise.resolve();
    return new Promise(resolve=>{
      const script=document.createElement('script');script.id=id;script.src=src;script.async=true;
      script.onload=()=>resolve();script.onerror=()=>resolve();document.head.appendChild(script);
    });
  }

  function editionDate(items){return STATUS().editionDate||items.map(x=>x.date).filter(Boolean).sort().at(-1)||''}

  function dominantCategories(items){
    const stats=new Map();
    items.forEach((item,index)=>{
      const cat=item.category||'AI';
      const current=stats.get(cat)||{count:0,first:index};
      current.count+=1;
      current.first=Math.min(current.first,index);
      stats.set(cat,current);
    });
    return [...stats.entries()].sort((a,b)=>b[1].count-a[1].count||a[1].first-b[1].first).slice(0,3).map(([name])=>name);
  }

  function validEditorial(date){
    const e=EDITORIAL();
    return e&&e.date===date?e:null;
  }

  function orderedTop(items,date){
    const e=validEditorial(date),map=new Map(items.map(item=>[item.id,item]));
    if(e&&Array.isArray(e.top3Ids)){
      const picked=e.top3Ids.map(id=>map.get(id)).filter(Boolean);
      if(picked.length===3)return picked;
    }
    return items.slice(0,3);
  }

  function summaryText(items,date){
    const e=validEditorial(date);
    if(e?.dailyOneLiner)return e.dailyOneLiner;
    const first=items[0],cats=dominantCategories(items);
    if(!first) return '今日版本正在整理。';
    const categoryText=cats.length?cats.join('、'):'AI 大事';
    return `今日 10 件事最集中喺 ${categoryText}；第一焦點係「${short(first.title,58)}」。`;
  }

  function shareBody(items,date){
    const top=orderedTop(items,date);
    const lines=top.map((item,index)=>`${index+1}. ${short(item.title,74)}`);
    const e=validEditorial(date);
    const one=e?.dailyOneLiner?['',short(e.dailyOneLiner,130)]:[];
    return [`AIson 今日 AI 10 件事｜${fmtDate(date)}`,...one,'',...lines].join('\n');
  }

  function shareText(items,date){
    return [shareBody(items,date),'','其餘 7 件＋香港影響：'+DAILY_URL].join('\n');
  }

  async function copyText(text){
    if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);return true}
    const area=document.createElement('textarea');area.value=text;area.style.position='fixed';area.style.opacity='0';document.body.appendChild(area);area.select();const ok=document.execCommand('copy');area.remove();return ok;
  }

  function showToast(message){
    const toast=$('#toast');
    if(!toast) return;
    toast.textContent=message;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),1800);
  }

  function renderReturnStatus(date){
    const root=$('#returnStatus');
    if(!root||!date) return;
    let previous='';
    try{previous=localStorage.getItem(LAST_SEEN_KEY)||''}catch{}
    if(previous&&previous!==date){
      root.innerHTML=`<b>今日有新版本</b><span>你上次睇到 ${esc(fmtDate(previous))} · 今版已更新</span>`;
    }else{
      root.innerHTML='<b>你已睇緊最新版本</b><span>AIson 通常每日香港時間 08:00 更新</span>';
    }
    try{localStorage.setItem(LAST_SEEN_KEY,date)}catch{}
  }

  function setupNewsletter(){
    const link=$('#returnNewsletter');
    if(!link) return;
    link.href=SITE().newsletter?.subscribeUrl||'https://aison-news.beehiiv.com/';
  }

  function renderSnapshot(){
    const items=NEWS().slice(0,10),date=editionDate(items);
    const text=$('#dailySnapshotText'),meta=$('#dailySnapshotMeta');
    if(text) text.textContent=summaryText(items,date);
    if(meta){
      const e=validEditorial(date);
      meta.textContent=date?`${fmtDate(date)} · 10 則已整理重點 · ${e?.source==='editorial'?'編輯主線':'香港視點'}`:'最新編輯版';
    }
    renderReturnStatus(date);
    setupNewsletter();

    const payload=shareText(items,date),nativeText=shareBody(items,date);
    $('#shareDailyBtn')?.addEventListener('click',async()=>{
      try{
        if(navigator.share){
          await navigator.share({title:`AIson 今日 AI 10 件事｜${fmtDate(date)}`,text:nativeText,url:DAILY_URL});
          return;
        }
        await copyText(payload);showToast('已複製今日分享文字');
      }catch(error){if(error?.name!=='AbortError')showToast('暫時未能分享')}
    });
    $('#copyDailyBtn')?.addEventListener('click',async()=>{
      try{await copyText(payload);showToast('已複製今日分享文字')}catch{showToast('暫時未能複製')}
    });
  }

  async function init(){
    if(document.body?.dataset.page!=='home')return;
    await Promise.all([
      loadScript('data/editorial.js?v=20260907-editorial','aison-editorial-data'),
      loadScript('analytics.js?v=20260907-analytics','aison-analytics-script'),
      loadScript('for-you.js?v=20260907-for-you','aison-for-you-script')
    ]);
    renderSnapshot();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
