(()=> {
  const key="aison-home-theme";
  const root=document.documentElement;
  const read=()=>{try{const value=localStorage.getItem(key);return value==="dark"||value==="light"?value:null}catch{return null}};
  const apply=value=>{root.dataset.theme=value;try{localStorage.setItem(key,value)}catch{}};
  const mount=()=>{
    let button=document.getElementById("themeToggle");
    if(!button){
      button=document.createElement("button");
      button.type="button";
      button.id="themeToggle";
      button.className="site-theme-toggle";
      button.innerHTML='<span aria-hidden="true">☾</span><span class="theme-toggle-label">深色</span>';
      const host=document.querySelector(".topbar .nav")||document.querySelector(".topbar .container")||document.querySelector(".topbar");
      if(host){
        const search=host.querySelector("#searchTrigger,.search-trigger");
        const menu=host.querySelector("#menuBtn,.menuBtn");
        if(search) search.insertAdjacentElement("afterend",button);
        else if(menu) menu.before(button);
        else host.append(button);
      }else document.body.append(button);
    }
    button.classList.add("site-theme-toggle");
    const paint=()=>{
      const dark=root.dataset.theme==="dark";
      button.setAttribute("aria-pressed",String(dark));
      button.setAttribute("aria-label",dark?"切換淺色模式":"切換深色模式");
      button.title=dark?"切換淺色模式":"切換深色模式";
      button.innerHTML='<span aria-hidden="true">'+(dark?"☀":"☾")+'</span><span class="theme-toggle-label">'+(dark?"淺色":"深色")+'</span>';
    };
    if(!button.dataset.themeBound){
      button.addEventListener("click",()=>{apply(root.dataset.theme==="dark"?"light":"dark");paint()});
      button.dataset.themeBound="true";
    }
    paint();
    document.addEventListener('aison-theme-change',paint);
    window.addEventListener("storage",event=>{if(event.key===key){root.dataset.theme=read() || (system.matches?'dark':'light');paint()}});
  };
  const saved=read();
  const system=window.matchMedia('(prefers-color-scheme: dark)');
  root.dataset.theme=saved || (system.matches?'dark':'light');
  system.addEventListener('change',event=>{if(!read()){root.dataset.theme=event.matches?'dark':'light';document.dispatchEvent(new Event('aison-theme-change'))}});
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",mount,{once:true});
  else mount();
})();