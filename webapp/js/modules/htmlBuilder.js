/**
 * HTML Builder — Generate standalone HTML deck
 */

import { parseDeckPages } from './deckParsers.js';

class HTMLBuilder {
  async buildHTML(project) {
    try {
      const pages = this._getRenderablePages(project);
      if (pages.length === 0) {
        return { success: false, error: 'No pages found' };
      }

      const theme = this._parseTheme(project.artifacts.deck_theme_tokens);
      const html = this._generateDeckHTML(pages, project, theme, project.artifacts.layout_manifest || { pages: [] });

      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      this._downloadBlob(blob, `${project.name}.html`);
      return { success: true, slideCount: pages.length };
    } catch (err) {
      console.error('HTML build failed:', err);
      return { success: false, error: err.message };
    }
  }

  _getRenderablePages(project) {
    const builtPages = project.artifacts.slide_state?.pages || [];
    if (builtPages.length > 0) {
      return builtPages.map(page => ({
        id: page.page_id,
        title: page.title,
        content: page.content || ''
      }));
    }
    return this._parsePages(project.artifacts.deck_clean_pages);
  }

  _generateDeckHTML(pages, project, theme, layoutManifest = { pages: [] }) {
    const colors = theme.colors || {};
    const primary = colors.primary || '#6366f1';
    const textDark = colors.text_dark || '#1e293b';
    const bg = colors.bg || '#ffffff';
    const builtPages = project.artifacts.slide_state?.pages || [];

    const slidesHtml = pages.map((page, idx) => {
      const layout = layoutManifest.pages.find(item => item.page_id === page.id) || {};
      const built = builtPages.find(item => item.page_id === page.id);
      if (built?.html) {
        return `
<article class="slide" id="slide-${idx + 1}" data-index="${idx + 1}" style="display:none;">
  ${built.html}
</article>`;
      }
      const lines = page.content.split('\n').filter(l => l.trim());
      const contentHtml = lines.map(l => {
        const trimmed = l.trim().replace(/^[-*•]\s*/, '');
        if (!trimmed) return '';
        if (trimmed.startsWith('【') && trimmed.endsWith('】')) {
          return `<h3 style="color:${primary};font-size:1.1em;margin:16px 0 8px;font-weight:600;">${trimmed}</h3>`;
        }
        if (/^\d+\./.test(trimmed)) {
          return `<li style="margin:6px 0;padding-left:8px;">${trimmed}</li>`;
        }
        return `<p style="margin:6px 0;line-height:1.6;">${trimmed}</p>`;
      }).join('');

      const isFirst = idx === 0;
      return `
<article class="slide" id="slide-${idx + 1}" data-index="${idx + 1}" style="display:none;">
  <div class="slide-inner" style="background:${isFirst ? primary : bg};color:${isFirst ? '#fff' : textDark};">
    <div class="slide-header">
      <div class="accent-bar" style="background:${isFirst ? '#fff' : primary};"></div>
      <span class="slide-number" style="color:${isFirst ? 'rgba(255,255,255,0.6)' : '#94a3b8'};">${String(idx + 1).padStart(2, '0')} · ${layout.archetype || 'content'}</span>
    </div>
    <h1 class="slide-title" style="font-size:${isFirst ? '2.8em' : '2em'};margin:16px 0 24px;line-height:1.2;font-weight:700;">${page.title}</h1>
    <div class="slide-body">${contentHtml}</div>
    <div class="slide-footer" style="color:${isFirst ? 'rgba(255,255,255,0.5)' : '#94a3b8'};">${project.name || 'PPT Deck Pro Max'}</div>
  </div>
</article>`;
    }).join('\n');

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${project.name || 'Deck'}</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { height: 100%; overflow: hidden; background: #0f172a; font-family: 'Microsoft YaHei','PingFang SC','Noto Sans SC',sans-serif; }
#app { display: flex; height: 100vh; }
#sidebar { width: 220px; background: #1e293b; color: #cbd5e1; display: flex; flex-direction: column; border-right: 1px solid #334155; }
#sidebar h2 { padding: 16px; font-size: 14px; font-weight: 600; color: #94a3b8; border-bottom: 1px solid #334155; }
#thumbnails { flex: 1; overflow-y: auto; padding: 8px; }
.thumb { padding: 10px; margin-bottom: 6px; border-radius: 8px; cursor: pointer; font-size: 12px; line-height: 1.4; transition: all .15s; border: 1px solid transparent; }
.thumb:hover { background: #334155; }
.thumb.active { background: ${primary}22; border-color: ${primary}; color: #fff; }
.thumb-num { font-size: 10px; color: #64748b; margin-bottom: 2px; }
#main { flex: 1; display: flex; flex-direction: column; position: relative; }
#stage { flex: 1; display: flex; align-items: center; justify-content: center; padding: 24px; background: #0f172a; }
.slide { width: 100%; max-width: 1100px; aspect-ratio: 16/9; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); border-radius: 12px; overflow: hidden; }
.slide-inner { height: 100%; padding: 48px 56px; display: flex; flex-direction: column; position: relative; }
.slide-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.accent-bar { width: 40px; height: 4px; border-radius: 2px; }
.slide-number { font-size: 14px; font-weight: 500; }
.slide-body { flex: 1; overflow-y: auto; font-size: 16px; line-height: 1.7; }
.slide-body ul { padding-left: 20px; }
.slide-body li { margin: 4px 0; }
.slide-footer { margin-top: auto; padding-top: 16px; font-size: 12px; border-top: 1px solid rgba(148,163,184,0.2); }
#controls { position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%); display: flex; gap: 8px; background: rgba(30,41,59,0.9); padding: 8px 16px; border-radius: 999px; backdrop-filter: blur(8px); border: 1px solid #334155; }
#controls button { background: transparent; border: none; color: #cbd5e1; cursor: pointer; padding: 6px 12px; font-size: 13px; border-radius: 6px; transition: all .15s; }
#controls button:hover { background: #334155; color: #fff; }
#progress { position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: #1e293b; }
#progress-bar { height: 100%; background: ${primary}; width: 0%; transition: width .3s ease; }
#counter { position: absolute; top: 24px; right: 24px; background: rgba(30,41,59,0.9); color: #94a3b8; padding: 6px 14px; border-radius: 999px; font-size: 12px; border: 1px solid #334155; }
@media (max-width: 768px) {
  #sidebar { display: none; }
  .slide-inner { padding: 24px; }
  .slide-title { font-size: 1.5em !important; }
}
</style>
</head>
<body>
<div id="app">
  <aside id="sidebar">
    <h2>${project.name || 'Deck'}</h2>
    <div id="thumbnails">
      ${pages.map((p, i) => `<div class="thumb" data-index="${i+1}"><div class="thumb-num">${String(i+1).padStart(2,'0')}</div>${p.title}</div>`).join('')}
    </div>
  </aside>
  <main id="main">
    <div id="counter">1 / ${pages.length}</div>
    <div id="stage">
      ${slidesHtml}
    </div>
    <div id="controls">
      <button id="btn-prev">◀ 上一页</button>
      <button id="btn-next">下一页 ▶</button>
      <button id="btn-overview">概览</button>
    </div>
    <div id="progress"><div id="progress-bar"></div></div>
  </main>
</div>
<script>
(function() {
  const slides = document.querySelectorAll('.slide');
  const thumbs = document.querySelectorAll('.thumb');
  const counter = document.getElementById('counter');
  const progressBar = document.getElementById('progress-bar');
  let current = 1;
  const total = slides.length;

  function show(idx) {
    if (idx < 1) idx = 1; if (idx > total) idx = total;
    current = idx;
    slides.forEach(s => s.style.display = 'none');
    const active = document.getElementById('slide-' + idx);
    if (active) active.style.display = 'block';
    thumbs.forEach(t => t.classList.toggle('active', parseInt(t.dataset.index) === idx));
    counter.textContent = idx + ' / ' + total;
    progressBar.style.width = ((idx / total) * 100) + '%';
  }

  thumbs.forEach(t => t.addEventListener('click', () => show(parseInt(t.dataset.index))));
  document.getElementById('btn-prev').addEventListener('click', () => show(current - 1));
  document.getElementById('btn-next').addEventListener('click', () => show(current + 1));
  document.getElementById('btn-overview').addEventListener('click', () => {
    const ov = document.getElementById('overview');
    if (ov) { ov.remove(); return; }
    const panel = document.createElement('div');
    panel.id = 'overview';
    panel.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.96);z-index:100;display:flex;flex-wrap:wrap;align-content:center;justify-content:center;gap:16px;padding:24px;overflow:auto;';
    slides.forEach((s, i) => {
      const card = document.createElement('div');
      card.style.cssText = 'width:280px;aspect-ratio:16/9;background:#1e293b;border-radius:8px;padding:16px;cursor:pointer;border:1px solid #334155;transition:all .15s;color:#fff;';
      card.innerHTML = '<div style="font-size:11px;color:#64748b;margin-bottom:6px;">' + String(i+1).padStart(2,'0') + '</div><div style="font-size:14px;font-weight:600;line-height:1.3;">' + (s.querySelector('.slide-title')?.textContent || '') + '</div>';
      card.addEventListener('click', () => { panel.remove(); show(i+1); });
      card.addEventListener('mouseenter', () => card.style.borderColor = '${primary}');
      card.addEventListener('mouseleave', () => card.style.borderColor = '#334155');
      panel.appendChild(card);
    });
    panel.addEventListener('click', (e) => { if (e.target === panel) panel.remove(); });
    document.body.appendChild(panel);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); show(current + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(current - 1); }
    if (e.key === 'Escape') { const ov = document.getElementById('overview'); if (ov) ov.remove(); }
  });

  show(1);
})();
</script>
</body>
</html>`;
  }

  _parsePages(markdown) {
    return parseDeckPages(markdown);
  }

  _parseTheme(jsonStr) {
    if (typeof jsonStr === 'object' && jsonStr !== null) {
      return jsonStr;
    }
    try {
      return JSON.parse(jsonStr || '{}');
    } catch (e) {
      return {};
    }
  }

  _downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

export const htmlBuilder = new HTMLBuilder();
