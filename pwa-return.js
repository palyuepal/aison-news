(() => {
  const VISIT_KEY='aison-visit-days-v1';
  const INSTALLED_KEY='aison-pwa-installed-v1';
  const DISMISSED_KEY='aison-pwa-dismissed-v1';
  const MIN_VISIT_DAYS=3;
  let deferredPrompt=null;

  const $=(s,r=document)=>r.querySelector(s);
  const isStandalone=()=>window.matchMedia?.('(display-mode: standalone)').matches===true || navigator.standalone===true;
  const isIOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent||'');

  function hktDateKey(){
    try{
      const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Hong_Kong',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
      const map=Object.fromEntries(parts.map(p=>[p.type,p.value]));
      return `${map.year}-${map.month}-${map.day}`;
    }catch{return new Date().toISOString().slice(0,10)}
  }

  function readJSON(key,fallback){
    try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch{return fallback}
  }
  function writeJSON(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
  function setValue(key,value){try{localStorage.setItem(key,value)}catch{}}
  function getValue(key){try{return localStorage.getItem(key)||''}catch{return ''}}

  function recordVisit(){
    const today=hktDateKey();
    const previous=readJSON(VISIT_KEY,[]);
    const days=Array.isArray(previous)?previous.filter(v=>/^\d{4}-\d{2}-\d{2}$/.test(v)):[];
    const next=[...new Set([...days,today])].sort().slice(-30);
    writeJSON(VISIT_KEY,next);
    return next.length;
  }

  function analytics(event,content=''){
    try{window.AISON_ANALYTICS?.track?.(event,{content})}catch{}
  }

  function showToast(message){
    const toast=$('#toast');
    if(!toast)return;
    toast.textContent=message;
    toast.classList.add('show');
    setTimeout(()=>toast.classList.remove('show'),2400);
  }

  function hideInstallButton(){
    $('#installAisonBtn')?.remove();
    $('#pwaInstallHelp')?.remove();
  }

  function renderIOSHelp(){
    const root=$('#returnCta');
    if(!root)return;
    let help=$('#pwaInstallHelp');
    if(!help){
      help=document.createElement('div');
      help.id='pwaInstallHelp';
      help.className='pwa-install-help';
      help.innerHTML='<b>iPhone 加入主畫面</b><span>用 Safari 開啟 AIson → 撳「分享」→「加入主畫面」。之後可當 App 咁直接開。</span><button type="button" aria-label="關閉提示">×</button>';
      root.appendChild(help);
      help.querySelector('button')?.addEventListener('click',()=>{
        help.remove();
        setValue(DISMISSED_KEY,hktDateKey());
        analytics('pwa_install_help_dismiss','ios');
      });
    }
  }

  function createInstallButton(mode){
    const actions=$('.return-cta-actions');
    if(!actions || $('#installAisonBtn'))return;
    const button=document.createElement('button');
    button.id='installAisonBtn';
    button.type='button';
    button.className='pwa-install';
    button.textContent='加入主畫面';
    button.addEventListener('click',async()=>{
      if(mode==='ios'){
        renderIOSHelp();
        analytics('pwa_install_help_open','ios');
        return;
      }
      if(!deferredPrompt){showToast('瀏覽器暫時未提供安裝選項');return}
      analytics('pwa_install_prompt','browser');
      deferredPrompt.prompt();
      const choice=await deferredPrompt.userChoice.catch(()=>null);
      if(choice?.outcome==='accepted'){
        setValue(INSTALLED_KEY,'1');
        analytics('pwa_install_accept','browser');
        hideInstallButton();
      }else{
        analytics('pwa_install_decline','browser');
      }
      deferredPrompt=null;
    });
    actions.appendChild(button);
    analytics('pwa_install_cta_shown',mode);
  }

  function maybeShowInstall(visits){
    if(visits<MIN_VISIT_DAYS || isStandalone() || getValue(INSTALLED_KEY)==='1')return;
    const dismissed=getValue(DISMISSED_KEY);
    if(dismissed===hktDateKey())return;
    if(deferredPrompt)createInstallButton('browser');
    else if(isIOS())createInstallButton('ios');
  }

  function init(){
    if(document.body?.dataset.page!=='home')return;
    const visits=recordVisit();
    if(isStandalone()){
      setValue(INSTALLED_KEY,'1');
      hideInstallButton();
      return;
    }
    window.addEventListener('beforeinstallprompt',event=>{
      event.preventDefault();
      deferredPrompt=event;
      maybeShowInstall(visits);
    });
    window.addEventListener('appinstalled',()=>{
      setValue(INSTALLED_KEY,'1');
      analytics('pwa_installed','browser');
      hideInstallButton();
    });
    maybeShowInstall(visits);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
