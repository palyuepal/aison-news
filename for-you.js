(() => {
  const STORAGE_KEY='aison-for-you-role-v1';
  const $=(s,r=document)=>r.querySelector(s);
  const esc=(s='')=>String(s).replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));
  const short=(s='',limit=92)=>{const clean=String(s).replace(/\s+/g,' ').trim();return clean.length>limit?clean.slice(0,limit).replace(/[，。；、\s]+$/,'')+'…':clean};

  const ROLES={
    worker:{label:'打工仔',hint:'工作／技能',keywords:['打工','員工','工作','職位','就業','技能','培訓','薪酬','生產力','辦公','workflow','copilot','自動化','career','worker']},
    sme:{label:'中小企／老闆',hint:'成本／營運',keywords:['中小企','企業','生意','老闆','成本','營運','客戶','採購','供應鏈','商業','收入','效率','合規','風險','sme','business']},
    creator:{label:'創作者',hint:'內容／版權',keywords:['創作者','創作','內容','設計','媒體','版權','影像','影片','video','廣告','品牌','marketing','creator','copyright']},
    developer:{label:'Developer',hint:'模型／Agent',keywords:['開發','developer','api','agent','模型','coding','程式','軟件','software','saas','安全','身份','權限','runtime','雲端','資料中心','gpu']},
    investor:{label:'市場／投資',hint:'資本／產業',keywords:['投資','投資者','市場','估值','融資','ipo','資本','股價','收入','毛利','成本','nvidia','晶片','資料中心','供應鏈','基金','valuation']}
  };

  function ensureShell(){
    let root=$('#forYouPanel');
    if(root)return root;
    const anchor=$('#dailySnapshot');
    if(!anchor)return null;
    if(!document.getElementById('aison-for-you-style')){
      const link=document.createElement('link');
      link.id='aison-for-you-style';link.rel='stylesheet';link.href='for-you.css?v=20260907-role-lens';
      document.head.appendChild(link);
    }
    root=document.createElement('section');
    root.className='for-you-panel';root.id='forYouPanel';root.setAttribute('aria-labelledby','forYouHeading');
    root.innerHTML='<div class="for-you-head"><div class="for-you-title"><div class="mini-label">ROLE LENS · LOCAL ONLY</div><h3 id="forYouHeading">你係邊類讀者？先睇最相關 3 件</h3><p id="forYouSummary">揀一個角色，AIson 會用今日新聞嘅香港影響幫你做本機排序。</p></div><span class="for-you-local">只儲存在此裝置</span></div><div class="for-you-roles" id="forYouRoles" aria-label="選擇閱讀角色"></div><div class="for-you-list" id="forYouList"></div>';
    anchor.insertAdjacentElement('afterend',root);
    return root;
  }

  function readRole(){try{const role=localStorage.getItem(STORAGE_KEY)||'';return ROLES[role]?role:''}catch{return ''}}
  function writeRole(role){try{role?localStorage.setItem(STORAGE_KEY,role):localStorage.removeItem(STORAGE_KEY)}catch{}}
  function stories(){return (window.AISON_NEWS||[]).slice().sort((a,b)=>(a.rank||99)-(b.rank||99)).slice(0,10)}
  function haystack(story){return [story.title,story.excerpt,story.summary,story.category,...(story.tags||[]),...(story.hkImpact||[])].join(' ').toLowerCase()}
  function occurrences(text,keyword){let count=0,pos=0;while((pos=text.indexOf(keyword,pos))!==-1){count++;pos+=keyword.length||1}return count}
  function scoreText(text,keywords){const hay=String(text||'').toLowerCase();return keywords.reduce((score,k)=>score+occurrences(hay,String(k).toLowerCase()),0)}
  function scoreStory(story,role){
    const def=ROLES[role],all=haystack(story),impacts=(story.hkImpact||[]).join(' ').toLowerCase();
    const impactScore=scoreText(impacts,def.keywords)*3;
    const generalScore=scoreText(all,def.keywords);
    const rankBonus=Math.max(0,11-Number(story.rank||10))*0.12;
    return impactScore+generalScore+rankBonus;
  }
  function bestImpact(story,role){
    const impacts=Array.isArray(story.hkImpact)?story.hkImpact.filter(Boolean):[];
    if(!impacts.length)return story.whyImportant||story.excerpt||'';
    const keywords=ROLES[role].keywords;
    return impacts.slice().sort((a,b)=>scoreText(b,keywords)-scoreText(a,keywords))[0]||impacts[0];
  }
  function recommendations(role){
    return stories().map(story=>({story,score:scoreStory(story,role),impact:bestImpact(story,role)}))
      .sort((a,b)=>b.score-a.score||(a.story.rank||99)-(b.story.rank||99)).slice(0,3);
  }

  function render(){
    const root=ensureShell();
    if(!root)return;
    const rolesRoot=$('#forYouRoles'),summary=$('#forYouSummary'),list=$('#forYouList');
    if(!rolesRoot||!summary||!list)return;
    const role=readRole();
    rolesRoot.innerHTML=Object.entries(ROLES).map(([key,def])=>`<button type="button" class="for-you-role${role===key?' active':''}" data-for-you-role="${key}" aria-pressed="${role===key}"><b>${esc(def.label)}</b><small>${esc(def.hint)}</small></button>`).join('');
    rolesRoot.querySelectorAll('[data-for-you-role]').forEach(button=>button.addEventListener('click',()=>{
      const next=role===button.dataset.forYouRole?'':button.dataset.forYouRole;
      writeRole(next);render();
    }));
    if(!role){
      summary.textContent='揀一個角色，AIson 會由今日 10 件事中先抽出同你最有關嘅 3 則影響。';
      list.innerHTML='<div class="for-you-empty"><b>呢個係角色視角，不係另一份新聞榜。</b><span>唔使登入、唔改寫新聞；你仍然可以照原本編輯次序睇晒今日 10 件事。</span></div>';
      return;
    }
    const def=ROLES[role],items=recommendations(role);
    summary.textContent=`「${def.label}」視角：根據今日香港影響文字先排最相關 3 則；新聞原本排名與內容保持不變。`;
    list.innerHTML=items.map(({story,impact},index)=>`<a class="for-you-card" href="news/${encodeURIComponent(story.id)}.html"><div class="for-you-card-top"><span>0${index+1} · ${esc(story.category||'AI')}</span><b>原榜 #${String(story.rank||'').padStart(2,'0')}</b></div><h4>${esc(story.title)}</h4><p><strong>同你有咩關係：</strong>${esc(short(impact,108))}</p><small>睇完整報道 →</small></a>`).join('');
  }

  function boot(){if(document.body?.dataset.page==='home')render()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
