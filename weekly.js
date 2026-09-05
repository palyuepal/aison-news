(() => {
  const PAGE_SIZE=20;
  const $=(s,r=document)=>r.querySelector(s);
  const esc=(s='')=>String(s).replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));
  const fmt=s=>{try{return new Intl.DateTimeFormat('zh-HK',{year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(s+'T00:00:00'))}catch{return s}};
  const short=(s='',n=120)=>{const t=String(s).replace(/\s+/g,' ').trim();return t.length>n?t.slice(0,n).replace(/[，。；、\s]+$/,'')+'…':t};
  const THEMES=[
    {id:'models',label:'模型與產品化',title:'競爭焦點由「模型夠唔夠勁」轉向「能否穩定落地」',keywords:['openai','chatgpt','gpt','google','gemini','anthropic','claude','meta','llama','apple intelligence','模型','agent','產品','rollout','工具','assistant'],why:'單次 benchmark 已經不足以定勝負，真正差異開始落在可靠性、部署速度、成本與工作流整合。',hk:'香港企業同創作者揀 AI 工具時，應由「邊個模型最勁」轉向評估穩定性、價格、資料治理同實際工作流。',watch:'留意主要平台下一輪定價、企業功能、Agent 能力，以及發布後的穩定性。'},
    {id:'infra',label:'算力與基建',title:'AI 上限愈來愈由晶片、封裝、電力與資料中心決定',keywords:['nvidia','tsmc','hbm','晶片','gpu','blackwell','rubin','data center','資料中心','grid','電網','電力','算力','基建','雲端','cloud'],why:'模型需求持續上升，但供給瓶頸已由 GPU 延伸到先進封裝、記憶體、電力與機房接入。',hk:'對香港企業而言，雲端價格、區域算力供應、資料中心容量與電力成本會逐步反映到 AI 服務成本。',watch:'留意新一代 GPU / HBM 量產、資料中心電力接入，以及雲端供應商資本開支。'},
    {id:'policy',label:'政策與安全',title:'AI 競爭開始被監管、政治與安全邊界重新定義',keywords:['政策','監管','安全','治理','政府','regulation','policy','safety','security','美國','中國','歐盟','eu','政治','操縱','合規'],why:'當 AI 能力進入政治、國安與大規模內容生成場景，產品策略開始受到規則而非純技術能力限制。',hk:'香港公司採用海外 AI 服務時，要同步關注資料流向、內容責任、跨境規則與供應商政策變化。',watch:'留意主要市場的 AI 法規、模型安全要求，以及平台對高風險用途的新限制。'},
    {id:'capital',label:'資本與商業化',title:'資金開始追「可規模化收入」而唔只係追 AI 故事',keywords:['ipo','融資','收購','投資','估值','資本','revenue','收入','enterprise','企業','copilot','audit','商業化','市場','valuation','funding','acquisition'],why:'AI 產業由概念期進入證明回報期，市場更重視企業採用、收入、成本與資本退出路徑。',hk:'香港市場會更直接受 AI IPO、企業採用與資本流向影響，亦會影響本地科技融資同服務採購預算。',watch:'留意企業續約、AI 每席位收入、IPO 進度，以及大型科技公司的 AI 資本開支回報。'},
    {id:'ecosystem',label:'平台與生態',title:'競爭由單一模型延伸到平台、連接器與開發者生態',keywords:['mistral','hugging face','開源','open source','connector','連接器','developer','開發者','api','生態','平台','workflow','工作流'],why:'當基礎模型差距縮窄，誰掌握開發者、資料連接、企業部署與分發入口，會變得同模型本身一樣重要。',hk:'中小企同創作者未必要綁死單一模型，能夠自由接駁工具、資料同模型的平台，長遠議價能力更高。',watch:'留意平台開放程度、API 價格、資料連接器，以及企業遷移成本。'},
    {id:'workflow',label:'工作流與創作',title:'AI 由聊天工具滲入真正專業工作流',keywords:['創作','影片','video','image','設計','creator','creative','工作流','workflow','productivity','生產力','audit','審計','office','copilot'],why:'AI 價值開始由「答問題」轉向直接完成工作流程中的步驟，對軟件席位與職能分工影響更實際。',hk:'香港創作者、設計、媒體與專業服務最容易首先感受到流程重組；真正值得追的是節省幾多時間，而唔係新功能數量。',watch:'留意 AI 工具可否真正嵌入常用軟件、是否能保持輸出一致，以及企業權限與審核能力。'}
  ];
  const STORYLINES=[
    {name:'OpenAI',aliases:['openai','chatgpt','gpt']},{name:'NVIDIA',aliases:['nvidia','blackwell','rubin','h100','h200']},
    {name:'Google',aliases:['google','gemini','deepmind']},{name:'Anthropic',aliases:['anthropic','claude']},
    {name:'Meta',aliases:['meta','llama']},{name:'SpaceX',aliases:['spacex','starlink','starship']},{name:'Apple',aliases:['apple','apple intelligence']}
  ];

  function loadIndex(){
    if(window.AISON_SEARCH_INDEX_PROMISE)return window.AISON_SEARCH_INDEX_PROMISE;
    window.AISON_SEARCH_INDEX_PROMISE=fetch('data/search-index.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error(`search index ${r.status}`);return r.json()}).then(rows=>Array.isArray(rows)?rows:[]);
    return window.AISON_SEARCH_INDEX_PROMISE;
  }
  function hay(row){return [row.title,row.excerpt,row.category,...(row.tags||[])].join(' ').toLowerCase()}
  function dateValue(s){const d=new Date(s+'T00:00:00Z');return Number.isNaN(d.getTime())?0:d.getTime()}
  function weekRows(rows){
    const dates=rows.map(r=>r.date).filter(Boolean).sort();
    const end=dates.at(-1); if(!end)return {items:[],start:'',end:''};
    const endDate=new Date(end+'T00:00:00Z'); const startDate=new Date(endDate); startDate.setUTCDate(startDate.getUTCDate()-6);
    const start=startDate.toISOString().slice(0,10);
    const items=rows.filter(r=>r.date>=start&&r.date<=end).sort((a,b)=>dateValue(b.date)-dateValue(a.date)||(a.rank||999999)-(b.rank||999999));
    return {items,start,end};
  }
  function themeHits(rows,theme){return rows.filter(row=>{const text=hay(row);return theme.keywords.some(k=>text.includes(k))})}
  function themeScore(rows,theme){
    const hits=themeHits(rows,theme);
    const categories=new Set(hits.map(r=>r.category));
    const recent=hits.reduce((s,r)=>s+Math.max(0,12-Math.min(12,Number(r.rank)||12)),0);
    return {theme,hits,score:hits.length*100+categories.size*10+recent};
  }
  function structuralShifts(rows){return THEMES.map(t=>themeScore(rows,t)).filter(x=>x.hits.length).sort((a,b)=>b.score-a.score).slice(0,3)}
  function topicHits(rows,def){return rows.filter(r=>{const text=hay(r);return r.category===def.name||(r.tags||[]).includes(def.name)||def.aliases.some(a=>text.includes(a))})}
  function storylineCards(allRows,week){
    return STORYLINES.map(def=>{const weekly=topicHits(week,def),all=topicHits(allRows,def);return {def,weekly,all}}).filter(x=>x.weekly.length&&x.all.length>=2).sort((a,b)=>b.weekly.length-a.weekly.length||b.all.length-a.all.length).slice(0,4);
  }
  function shiftCard(entry,index){
    const {theme,hits}=entry; const lead=hits[0],second=hits[1];
    const context=second?`本週 ${hits.length} 則相關報道，由〈${lead.title}〉延伸到〈${second.title}〉。`:`本週焦點由〈${lead.title}〉帶動。`;
    return `<article class="weekly-shift"><div class="weekly-shift-num">0${index+1}</div><div class="weekly-shift-body"><div class="weekly-shift-label">${esc(theme.label)} · ${hits.length} 則訊號</div><h3>${esc(theme.title)}</h3><p>${esc(short(context,180))}</p><div class="weekly-analysis"><div><b>為何重要</b><span>${esc(theme.why)}</span></div><div><b>香港角度</b><span>${esc(theme.hk)}</span></div><div><b>下週睇咩</b><span>${esc(theme.watch)}</span></div></div><div class="weekly-shift-links"><a href="news/${encodeURIComponent(lead.id)}.html">閱讀代表報道 →</a><a href="topics.html?topic=${encodeURIComponent(lead.category)}">追蹤相關主題 →</a></div></div></article>`;
  }
  function storylineCard(item){
    const latest=item.weekly[0],earliest=item.all.slice().sort((a,b)=>dateValue(a.date)-dateValue(b.date))[0];
    return `<a class="weekly-storyline" href="topics.html?topic=${encodeURIComponent(item.def.name)}"><div class="weekly-storyline-top"><span>STORYLINE</span><b>本週 ${item.weekly.length} 則</b></div><h3>${esc(item.def.name)}</h3><p>${esc(short(latest?.title||'',100))}</p><div class="weekly-storyline-meta"><span>累計 ${item.all.length} 篇</span><span>${fmt(earliest?.date||'')} → ${fmt(latest?.date||'')}</span></div><strong>查看完整故事線 →</strong></a>`;
  }
  function listItem(row){return `<a class="weekly-news-item" href="news/${encodeURIComponent(row.id)}.html"><div><span>${fmt(row.date)} · ${esc(row.category)}</span><h3>${esc(row.title)}</h3><p>${esc(short(row.excerpt,120))}</p></div><b>→</b></a>`}
  function renderTake(shifts,week){
    const root=$('#weeklyTake'); if(!root||!shifts.length)return;
    const labels=shifts.map(x=>x.theme.label).join('、');
    const top=shifts[0].theme;
    root.innerHTML=`<div class="mini-label">AIson TAKE</div><h2>本週最值得記住嘅一句</h2><p>今個星期唔係單一模型或產品贏輸，而係 <strong>${esc(labels)}</strong> 同時開始改變 AI 競爭方式。當中最強訊號係：${esc(top.title)}。</p><small>AIson 以最近 7 個有發布資料的自然日、共 ${week.length} 篇報道歸納；這是編輯式趨勢整理，不是投資建議。</small>`;
  }
  function bindMobile(){const button=$('#menuBtn'),menu=$('#mobileNav');if(!button||!menu||button.dataset.weeklyBound)return;button.dataset.weeklyBound='1';button.addEventListener('click',()=>{menu.style.display=menu.style.display==='block'?'none':'block'})}
  async function init(){
    if(document.body?.dataset.page!=='weekly')return;
    bindMobile();
    const edition=$('#weeklyEdition'),stats=$('#weeklyStats'),shiftsRoot=$('#weeklyShifts'),storyRoot=$('#weeklyStorylines'),list=$('#weeklyList'),more=$('#weeklyLoadMore');
    if(!edition||!stats||!shiftsRoot||!storyRoot||!list||!more)return;
    let rows=[]; try{rows=await loadIndex()}catch(error){console.error(error);edition.textContent='本週索引暫時載入失敗，請稍後再試。';return}
    rows=rows.slice().sort((a,b)=>(a.rank||999999)-(b.rank||999999));
    const windowed=weekRows(rows),week=windowed.items;
    const cats=new Set(week.map(r=>r.category));
    edition.textContent=week.length?`${fmt(windowed.start)} – ${fmt(windowed.end)} · 用 7 日資料睇結構性改變，而唔係只排新聞 Top 3。`:'暫未有足夠本週資料。';
    stats.innerHTML=`<span><b>${week.length}</b> 篇本週報道</span><span><b>${cats.size}</b> 個分類</span><span><b>${windowed.end?fmt(windowed.end):'—'}</b> 最新版本</span>`;
    if(!week.length){shiftsRoot.innerHTML='<div class="weekly-empty">暫未有足夠資料整理本週結構性變化。</div>';storyRoot.innerHTML='';list.innerHTML='';more.hidden=true;return}
    const shifts=structuralShifts(week);
    shiftsRoot.innerHTML=shifts.map(shiftCard).join('');
    renderTake(shifts,week);
    const storylines=storylineCards(rows,week);
    storyRoot.innerHTML=storylines.length?storylines.map(storylineCard).join(''):'<div class="weekly-empty">今週未有足夠連續事件形成主題故事線。</div>';
    let visible=PAGE_SIZE;
    const renderList=()=>{const shown=week.slice(0,visible),remaining=Math.max(0,week.length-shown.length);list.innerHTML=shown.map(listItem).join('');more.hidden=!remaining;more.textContent=remaining?`載入更多（尚餘 ${remaining} 篇）`:'已顯示全部';};
    more.addEventListener('click',()=>{visible+=PAGE_SIZE;renderList()});
    renderList();
  }
  document.addEventListener('DOMContentLoaded',init);
})();
