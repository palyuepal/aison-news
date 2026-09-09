(() => {
  const esc=(s='')=>String(s).replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));
  const fmt=value=>{try{return new Intl.DateTimeFormat('zh-HK',{year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(String(value).slice(0,10)+'T00:00:00'))}catch{return String(value||'')}};
  function story(){
    const rows=window.AISON_NEWS||[];
    const id=window.AISON_ARTICLE_ID||new URLSearchParams(location.search).get('id')||rows[0]?.id;
    return rows.find(item=>item.id===id)||rows[0]||null;
  }
  function patchJsonLd(n){
    const node=document.querySelector('#jsonld');
    if(!node||!n?.updatedAt)return;
    try{const data=JSON.parse(node.textContent||'{}');data.dateModified=n.updatedAt;node.textContent=JSON.stringify(data)}catch{}
  }
  function textLength(value=''){return String(value||'').replace(/\s+/g,'').length}
  function deepReadReady(n){
    if(!n?.verified||!n.sourceUrl)return false;
    const impacts=Array.isArray(n.hkImpact)?n.hkImpact:[];
    const total=['summary','whatHappened','reportingContext','deepDive','whyImportant','whatToWatch','take'].reduce((sum,key)=>sum+textLength(n[key]),0)+impacts.reduce((sum,item)=>sum+textLength(item),0);
    return impacts.length>=3&&textLength(n.whatHappened)>=300&&textLength(n.reportingContext)>=400&&textLength(n.deepDive)>=900&&textLength(n.whyImportant)>=250&&textLength(n.whatToWatch)>=180&&total>=2800;
  }
  function compact(value='',limit=220){const text=String(value||'').replace(/\s+/g,' ').trim();return text.length>limit?text.slice(0,limit).replace(/[，。；：、\s]+$/,'')+'…':text}
  function addDeepReadStyles(){
    if(document.getElementById('aison-deep-read-style'))return;
    const style=document.createElement('style');style.id='aison-deep-read-style';style.textContent=`
      .article-depth-pill{display:inline-flex;align-items:center;padding:5px 9px;border-radius:999px;background:#fff2b8;color:#624800;font-size:10px;font-weight:950;letter-spacing:.05em}
      .article-quick-read{margin:0 0 24px;padding:22px;border:1px solid #cfe0f5;border-radius:18px;background:linear-gradient(145deg,#f7fbff,#eef6ff);box-shadow:0 10px 28px rgba(6,26,58,.06)}.article-quick-head{display:flex;align-items:flex-start;justify-content:space-between;gap:15px;margin-bottom:16px}.article-quick-head small{display:block;color:#174c92;font-size:10px;font-weight:950;letter-spacing:.08em}.article-quick-head h2{margin:4px 0 0!important;font-size:23px!important;color:#061a3a}.article-quick-mode{flex:0 0 auto;padding:6px 9px;border-radius:999px;background:#061a3a;color:#ffe187;font-size:9px;font-weight:950;letter-spacing:.06em}.article-quick-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.article-quick-item{padding:14px;border:1px solid #d9e7f7;border-radius:13px;background:#fff}.article-quick-item b{display:block;margin-bottom:7px;color:#123b78;font-size:11px}.article-quick-item p{margin:0!important;color:#324b6c;font-size:13px!important;line-height:1.65!important}.article-truth-key{display:flex;flex-wrap:wrap;gap:8px;margin-top:13px;padding-top:13px;border-top:1px solid #d8e6f8}.article-truth-key span{padding:5px 8px;border-radius:999px;background:#fff;color:#526780;font-size:10px;font-weight:850}.article-section-label{display:inline-flex;margin:0 0 9px;padding:5px 8px;border-radius:999px;font-size:10px;font-weight:950;letter-spacing:.03em}.article-section-label.fact{background:#e9f8ef;color:#176b3b}.article-section-label.context{background:#fff4d5;color:#705200}.article-section-label.analysis{background:#edf1ff;color:#334a9e}
      @media(max-width:720px){.article-quick-read{padding:17px}.article-quick-head{align-items:flex-start}.article-quick-grid{grid-template-columns:1fr}.article-quick-mode{font-size:8px}.article-quick-item{padding:12px}}
    `;document.head.appendChild(style);
  }
  function labelSections(){
    const sections=[...document.querySelectorAll('#articleBody .info-block')];
    sections.forEach(section=>{
      if(section.querySelector('.article-section-label'))return;
      const heading=section.querySelector('h2');if(!heading)return;
      const title=heading.textContent||'';
      let cls='',label='';
      if(title.includes('目前已知')){cls='fact';label='✅ 已確認事實'}
      else if(title.includes('事件背景')||title.includes('深入解讀')){cls='context';label='🟡 背景、機制與仍待驗證部分'}
      else if(title.includes('AIson Take')){cls='analysis';label='🧠 AIson 分析'}
      if(!label)return;
      const node=document.createElement('small');node.className='article-section-label '+cls;node.textContent=label;heading.insertAdjacentElement('afterend',node);
    });
  }
  function renderQuickRead(n){
    const body=document.querySelector('#articleBody');
    if(!body||document.querySelector('.article-quick-read'))return;
    addDeepReadStyles();
    const deep=deepReadReady(n);
    if(deep&&!document.querySelector('.article-depth-pill')){
      const meta=document.querySelector('#articleMeta');
      if(meta){const badge=document.createElement('span');badge.className='article-depth-pill';badge.textContent='DEEP READ';meta.appendChild(badge)}
    }
    const box=document.createElement('section');box.className='article-quick-read';box.setAttribute('aria-label','30 秒睇懂');
    const confirmed=compact(n.summary||n.whatHappened||n.excerpt,230);
    const important=compact(n.whyImportant||n.reportingContext||n.excerpt,210);
    const hk=compact((n.hkImpact||[])[0]||'完整文章會整理這則消息對香港讀者、公司及創作者的實際影響。',210);
    box.innerHTML=`<div class="article-quick-head"><div><small>AIson QUICK READ</small><h2>30 秒睇懂</h2></div><span class="article-quick-mode">${deep?'DEEP READ':'FULL REPORT'}</span></div><div class="article-quick-grid"><div class="article-quick-item"><b>✅ 已確認</b><p>${esc(confirmed)}</p></div><div class="article-quick-item"><b>🎯 點解重要</b><p>${esc(important)}</p></div><div class="article-quick-item"><b>🇭🇰 香港角度</b><p>${esc(hk)}</p></div></div><div class="article-truth-key"><span>✅ 已確認 = 有來源支持</span><span>🟡 背景 = 有限制或仍待細節</span><span>🧠 AIson 分析 = 判斷，不當作事實</span></div>`;
    const guide=body.querySelector(':scope > .reader-guide');
    if(guide)guide.insertAdjacentElement('afterend',box);else body.prepend(box);
    labelSections();
  }
  function render(){
    if(document.body?.dataset.page!=='article')return;
    const n=story(),anchor=document.querySelector('#articleTags');
    if(!n||!anchor)return;
    renderQuickRead(n);
    if(document.querySelector('.article-trust-record')){patchJsonLd(n);return}
    const record=document.createElement('div');
    record.className='article-trust-record';
    const status=n.correctionNote?'有公開更正':n.updatedAt?'內容曾更新':'未有更正紀錄';
    record.innerHTML=`<strong>編採紀錄</strong><span>首次發布 ${esc(fmt(n.date))}</span>${n.updatedAt?`<span>最後更新 ${esc(fmt(n.updatedAt))}</span>`:''}<span>${esc(status)}</span><a href="corrections.html">查看更正紀錄 →</a>`;
    anchor.insertAdjacentElement('afterend',record);

    if(n.correctionNote){
      const box=document.createElement('div');box.className='article-correction';
      box.innerHTML=`<b>更正紀錄 · ${esc(fmt(n.updatedAt||n.date))}</b><p>${esc(n.correctionNote)}</p>`;
      record.insertAdjacentElement('afterend',box);
    }
    if(n.followUpOf){
      const previous=(window.AISON_NEWS||[]).find(item=>item.id===n.followUpOf);
      const box=document.createElement('div');box.className='article-followup';
      const label=previous?.title||'查看上一則相關報道';
      box.innerHTML=`<b>前情提要</b><p>這篇屬既有事件的後續進展，建議連同前一則報道閱讀。</p><a href="news/${encodeURIComponent(n.followUpOf)}.html">${esc(label)} →</a>`;
      const after=document.querySelector('.article-correction')||record;after.insertAdjacentElement('afterend',box);
    }
    patchJsonLd(n);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>requestAnimationFrame(render),{once:true});
  else requestAnimationFrame(render);
})();