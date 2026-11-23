/* ===== AIson Concept C — magazine front page layer =====
   Progressive enhancement on top of the V6/B2 home renderers.
   Replaces the signal-hero region with the Concept C magazine hero
   (lead story, score ring, editorial art, subscribe band, ticker and
   stories 02-03 as image cards). Any failure leaves the previous
   design untouched. */
(() => {
  'use strict';
  const esc = (value = '') => String(value).replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
  const brief = (value = '', limit = 200) => { const s = String(value || '').replace(/\s+/g, ' ').trim(); return s.length > limit ? s.slice(0, limit).replace(/[，。；、\s]+$/, '') + '…' : s; };
  const fmt = value => { try { return new Intl.DateTimeFormat('zh-HK', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(new Date(String(value).slice(0, 10) + 'T00:00:00')); } catch { return String(value || ''); } };
  const url = n => 'news/' + encodeURIComponent(n.id) + '.html';
  const FALLBACK_ART = 'assets/concept-c/hero-gauge.webp';

  function highlightTitle(title) {
    return esc(title).replace(/「([^」]+)」/, '「<em class="cc-hl">$1</em>」').replace(/『([^』]+)』/, '『<em class="cc-hl">$1</em>』');
  }

  function scoreRing(score) {
    const c = 276.5, off = (c * (1 - Math.max(0, Math.min(10, score)) / 10)).toFixed(1);
    return '<svg class="cc-ring" viewBox="0 0 100 100" role="img" aria-label="AIson Score ' + score.toFixed(1) + ' / 10">' +
      '<circle cx="50" cy="50" r="44" fill="none" stroke="#23405c" stroke-width="7"/>' +
      '<circle cx="50" cy="50" r="44" fill="none" stroke="#f2a900" stroke-width="7" stroke-linecap="round" stroke-dasharray="' + c + '" stroke-dashoffset="' + off + '" transform="rotate(-90 50 50)"/>' +
      '<text class="cc-ring-num" x="50" y="53" text-anchor="middle">' + score.toFixed(1) + '</text>' +
      '<text class="cc-ring-cap" x="50" y="71" text-anchor="middle">AISON SCORE</text></svg>';
  }

  function heroArt(lead) {
    const v = lead && lead.visual && typeof lead.visual === 'object' && lead.visual.src ? lead.visual : null;
    const fallback = '<div class="cc-art-fallback"><span class="cc-af-cat">' + esc(lead.category || 'AI NEWS') + '</span><b>01</b><span class="cc-af-cap">TODAY\'S SIGNAL · AISON DAILY</span></div>';
    if (v && v.cardSrc) {
      return '<figure class="cc-hero-art">' + fallback + '<img src="' + esc(v.cardSrc) + '" alt="' + esc(v.alt || lead.title || '') + '" onerror="this.remove()"><figcaption>' + esc(v.credit || 'AIson 編輯配圖') + '</figcaption></figure>';
    }
    if (v && v.kind !== 'aison-original') {
      return '<figure class="cc-hero-art">' + fallback + '<img src="' + esc(v.src) + '" alt="' + esc(v.alt || lead.title || '') + '" onerror="this.remove()"><figcaption>' + esc(v.credit || 'AIson 編輯配圖') + '</figcaption></figure>';
    }
    return '<figure class="cc-hero-art">' + fallback + '<img src="' + FALLBACK_ART + '" alt="AI 能力指標迫近共同紅線（示意圖）" onerror="this.remove()"><figcaption>AIson 編輯配圖 · 能力指標迫近共同紅線（示意）</figcaption></figure>';
  }

  function cardMedia(n, rank) {
    const v = n && n.visual && typeof n.visual === 'object' && n.visual.src ? n.visual : null;
    if (v && v.cardSrc) {
      return '<div class="cc-card-media"><img src="' + esc(v.cardSrc) + '" alt="' + esc(v.alt || n.title || '') + '" loading="lazy" decoding="async"><span class="cc-card-rank">0' + rank + '</span></div>';
    }
    if (v && v.kind !== 'aison-original') {
      return '<div class="cc-card-media"><img src="' + esc(v.src) + '" alt="' + esc(v.alt || n.title || '') + '" loading="lazy" decoding="async"><span class="cc-card-rank">0' + rank + '</span></div>';
    }
    return '<div class="cc-card-media cc-card-fallback cc-fb-' + rank + '"><span class="cc-fb-cat">' + esc(n.category || 'AI NEWS') + '</span><span class="cc-card-rank">0' + rank + '</span></div>';
  }

  function init() {
    if (document.body?.dataset.page !== 'home') return;
    const news = (window.AISON_NEWS || []).slice().sort((a, b) => (Number(a.rank) || 999) - (Number(b.rank) || 999));
    if (news.length < 3) return;
    const root = document.getElementById('v6SignalHero');
    if (!root) return;
    const lead = news[0];
    const editorial = window.AISON_EDITORIAL || {};
    const oneLine = (editorial.date === lead.date && editorial.dailyOneLiner) || lead.summary || lead.excerpt || '';
    const score = Number(lead.aisonScore) || Math.max(3, 11 - (Number(lead.rank) || 1));
    const rest = news.slice(1, 3);
    const tickerItems = news.map(n => '<li>◆ ' + esc(n.title) + '</li>').join('');

    root.innerHTML =
      '<div class="cc-hero"><div class="cc-wrap cc-hero-grid">' +
        '<div class="cc-hero-copy">' +
          '<div class="cc-kicker">AISON DAILY · 今日頭條 STORY 01</div>' +
          '<h2 class="cc-hero-title">' + highlightTitle(lead.title) + '</h2>' +
          '<p class="cc-dek">' + esc(brief(oneLine === (lead.summary || '') ? (lead.excerpt || oneLine) : oneLine, 190)) + '</p>' +
          '<div class="cc-hero-meta">' + scoreRing(score) +
            '<span class="cc-meta-items">' + (lead.verified ? '<b class="cc-verified">✓ 已核實</b>' : '') + '<span>' + esc(lead.category || 'AI NEWS') + '</span><span>◷ ' + esc(lead.readTime || '完整報道') + '閱讀</span></span>' +
          '</div>' +
          '<div class="cc-actions"><a class="cc-btn" href="' + url(lead) + '">閱讀完整報道 →</a><a class="cc-btn cc-btn-ghost" href="#today">睇今日其餘 ' + (news.length - 1) + ' 件事</a></div>' +
        '</div>' +
        heroArt(lead) +
      '</div></div>' +
      '<div class="cc-band"><div class="cc-wrap cc-band-in"><b>AIson Morning Brief</b><span>重要 AI 新聞，朝早直接送到 — 每日 3–5 分鐘讀完。</span><a class="cc-btn cc-btn-dark" href="#newsletter">免費訂閱</a></div></div>' +
      '<section class="cc-ticker" aria-label="今日新聞快訊"><div class="cc-ticker-track"><ul>' + tickerItems + '</ul><ul aria-hidden="true">' + tickerItems + '</ul></div></section>' +
      '<section class="cc-top"><div class="cc-wrap">' +
        '<div class="cc-sec-head"><span class="cc-en">TOP STORIES</span><h2>今日頭三條</h2></div>' +
        '<div class="cc-cards">' + rest.map((n, i) => {
          const s = Number(n.aisonScore) || Math.max(3, 11 - (Number(n.rank) || 10));
          return '<a class="cc-card" href="' + url(n) + '">' + cardMedia(n, i + 2) +
            '<div class="cc-card-body"><span class="cc-cat">' + esc(n.category || 'AI NEWS') + '</span>' +
            '<h3>' + esc(n.title) + '</h3><p>' + esc(brief(n.quickTake || n.excerpt || n.summary, 108)) + '</p>' +
            '<div class="cc-card-meta">' + (n.verified ? '<span class="cc-verified">✓ 已核實</span>' : '') + '<span class="cc-score-chip">' + s.toFixed(1) + ' / 10</span><span class="cc-sbar"><span style="width:' + (s * 10).toFixed(0) + '%"></span></span></div></div></a>';
        }).join('') + '</div>' +
      '</div></section>';

    root.hidden = false;
    document.body.classList.add('cc-ready');

    const sectionHead = document.querySelector('#today .section-head');
    if (sectionHead) {
      const label = sectionHead.querySelector('.mini-label'), title = sectionHead.querySelector('h2');
      if (label) label.textContent = "EDITOR'S RANKING";
      if (title) title.textContent = '完整排行榜 04–' + String(news.length).padStart(2, '0');
    }
  }

  try {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(init, 30), { once: true });
    else setTimeout(init, 30);
  } catch (error) {
    console.warn('AIson Concept C layer skipped', error);
  }
})();
