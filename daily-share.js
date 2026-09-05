(() => {
  const CARD_PATH = 'assets/social/daily-latest.jpg';
  const PAGE_URL = 'https://aison.hk/daily.html';

  function toast(message) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 1800);
  }

  function editionDate() {
    return window.AISON_STATUS?.editionDate || new Date().toISOString().slice(0, 10);
  }

  async function cardFile() {
    const response = await fetch(CARD_PATH, { cache: 'no-store' });
    if (!response.ok) throw new Error(`card fetch failed: ${response.status}`);
    const blob = await response.blob();
    return new File([blob], `aison-ai-10-${editionDate()}.jpg`, { type: blob.type || 'image/jpeg' });
  }

  async function shareDailyCard() {
    const title = `AIson｜今日 AI 10 件事 ${editionDate()}`;
    const text = '一張圖睇晒今日最重要 10 件 AI 大事＋香港角度。';
    try {
      const file = await cardFile();
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title, text, url: PAGE_URL });
        return;
      }
      if (navigator.share) {
        await navigator.share({ title, text, url: PAGE_URL });
        return;
      }
      await navigator.clipboard.writeText(PAGE_URL);
      toast('已複製今日連結');
    } catch (error) {
      if (error?.name === 'AbortError') return;
      try {
        await navigator.clipboard.writeText(PAGE_URL);
        toast('分享未支援，已複製今日連結');
      } catch {
        window.open(CARD_PATH, '_blank', 'noopener');
      }
    }
  }

  async function downloadDailyCard() {
    try {
      const file = await cardFile();
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast('已下載今日總覽圖');
    } catch {
      window.open(CARD_PATH, '_blank', 'noopener');
    }
  }

  async function copyDailyLink() {
    try {
      await navigator.clipboard.writeText(PAGE_URL);
      toast('已複製今日連結');
    } catch {
      window.prompt('複製今日連結：', PAGE_URL);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('shareDailyCard')?.addEventListener('click', shareDailyCard);
    document.getElementById('downloadDailyCard')?.addEventListener('click', downloadDailyCard);
    document.getElementById('copyDailyLink')?.addEventListener('click', copyDailyLink);
  });
})();
