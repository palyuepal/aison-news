(()=>{
  'use strict';

  const NEWS=(window.AISON_NEWS||[]).slice().sort((a,b)=>(Number(a.rank)||999)-(Number(b.rank)||999));
  const BY_ID=new Map(NEWS.map(story=>[String(story.id||''),story]));

  function storyIdFromHref(href=''){
    try{
      const url=new URL(href,location.href);
      const match=url.pathname.match(/\/news\/([^/]+)\.html$/);
      return match?decodeURIComponent(match[1]):'';
    }catch{return ''}
  }

  function storyFromLink(link){
    if(!link)return null;
    return BY_ID.get(storyIdFromHref(link.getAttribute('href')||link.href||''))||null;
  }

  function imageFor(story){
    if(!story?.id)return null;
    const visual=story.visual&&typeof story.visual==='object'?story.visual:null;
    if(visual?.src){
      return {
        src:String(visual.src),
        alt:String(visual.alt||story.title||'AIson 新聞圖片'),
        credit:String(visual.credit||''),
        sourceUrl:String(visual.sourceUrl||''),
        kind:String(visual.kind||'official-press')
      };
    }
    return {
      src:`assets/social/${encodeURIComponent(story.id)}.jpg`,
      alt:`${story.title||'AIson 新聞'}｜AIson 編輯圖片`,
      credit:'AIson 編輯圖片',
      sourceUrl:'',
      kind:'aison-social'
    };
  }

  function makeFigure(story,{className='',eager=false,caption=false}={}){
    const data=imageFor(story);if(!data)return null;
    const figure=document.createElement('figure');
    figure.className=`news-visual ${className}`.trim();
    figure.dataset.imageKind=data.kind;

    const img=document.createElement('img');
    img.src=data.src;
    img.alt=data.alt;
    img.decoding='async';
    img.loading=eager?'eager':'lazy';
    if(eager)img.fetchPriority='high';
    img.addEventListener('error',()=>figure.remove(),{once:true});
    figure.append(img);

    if(caption&&data.credit){
      const figcaption=document.createElement('figcaption');
      const prefix=document.createElement('span');
      prefix.textContent=data.kind==='official-press'?'圖片來源：':'圖片：';
      figcaption.append(prefix);
      if(data.sourceUrl){
        const source=document.createElement('a');
        source.href=data.sourceUrl;
        source.target='_blank';
        source.rel='noopener noreferrer';
        source.textContent=data.credit;
        source.addEventListener('click',event=>event.stopPropagation());
        figcaption.append(source);
      }else{
        const credit=document.createElement('span');
        credit.textContent=data.credit;
        figcaption.append(credit);
      }
      figure.append(figcaption);
    }
    return figure;
  }

  function enhanceLead(){
    const lead=document.querySelector('#editorialFeature a.front-story.lead');
    if(!lead||lead.querySelector('.lead-story-media'))return;
    const story=storyFromLink(lead)||NEWS[0];
    const figure=makeFigure(story,{className:'lead-story-media',eager:true});
    if(!figure)return;
    const oldArt=lead.querySelector('.lead-story-art');
    if(oldArt)oldArt.replaceWith(figure);else lead.append(figure);
  }

  function enhanceSecondary(){
    document.querySelectorAll('#editorialFeature a.front-story.secondary').forEach(link=>{
      if(link.querySelector('.front-story-media'))return;
      const story=storyFromLink(link);if(!story)return;
      const figure=makeFigure(story,{className:'front-story-media'});if(!figure)return;
      const meta=link.querySelector('.front-story-meta');
      if(meta)meta.after(figure);else link.prepend(figure);
    });
  }

  function enhanceNewsCards(root=document){
    root.querySelectorAll('a.news-card').forEach(card=>{
      if(card.querySelector('.news-card-media'))return;
      const story=storyFromLink(card);if(!story)return;
      const figure=makeFigure(story,{className:'news-card-media'});if(!figure)return;
      const leading=card.querySelector('.card-leading');
      const content=leading?.nextElementSibling||card.lastElementChild;
      if(content&&content!==leading)content.prepend(figure);else card.prepend(figure);
      card.classList.add('has-news-image');
    });
  }

  function currentArticle(){
    const explicit=window.AISON_ARTICLE_ID||new URLSearchParams(location.search).get('id')||'';
    return BY_ID.get(String(explicit))||NEWS[0]||null;
  }

  function enhanceArticleHero(){
    const body=document.getElementById('articleBody');
    if(!body||body.querySelector('.article-news-media'))return;
    const story=currentArticle();if(!story)return;
    const figure=makeFigure(story,{className:'article-news-media',eager:true,caption:true});if(!figure)return;
    const guide=body.querySelector(':scope > .reader-guide');
    if(guide)guide.after(figure);else body.prepend(figure);
  }

  function enhanceRelated(root=document){
    root.querySelectorAll('a.related-card,a.article-related-card').forEach(card=>{
      if(card.querySelector('.related-news-media'))return;
      const story=storyFromLink(card);if(!story)return;
      const figure=makeFigure(story,{className:'related-news-media'});if(!figure)return;
      card.prepend(figure);
      card.classList.add('has-news-image');
    });
  }

  function run(){
    const page=document.body?.dataset?.page||'';
    if(page==='home'){
      enhanceLead();
      enhanceSecondary();
    }
    enhanceNewsCards();
    if(page==='article')enhanceArticleHero();
    enhanceRelated();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);
  else run();
})();
