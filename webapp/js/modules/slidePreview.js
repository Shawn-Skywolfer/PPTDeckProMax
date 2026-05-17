/**
 * Slide Preview — 解析 deck_clean_pages.md + visual_composition.md 渲染 HTML/SVG slides
 */

import { parseDeckPages, parseVisualSections } from './deckParsers.js';

const ARCHETYPES = {
  title: { name: '封面', bg: 'bg-gradient-to-br from-slate-900 to-slate-800', text: 'text-white' },
  content: { name: '内容', bg: 'bg-white', text: 'text-slate-800' },
  two_column: { name: '双栏', bg: 'bg-white', text: 'text-slate-800' },
  chart: { name: '图表', bg: 'bg-white', text: 'text-slate-800' },
  big_number: { name: '大数字', bg: 'bg-white', text: 'text-slate-800' },
  comparison: { name: '对比', bg: 'bg-white', text: 'text-slate-800' },
  timeline: { name: '时间线', bg: 'bg-white', text: 'text-slate-800' },
  matrix: { name: '矩阵', bg: 'bg-white', text: 'text-slate-800' },
  cta: { name: 'CTA', bg: 'bg-gradient-to-br from-indigo-900 to-violet-900', text: 'text-white' }
};

class SlidePreview {
  constructor() {
    this.pages = [];
    this.visuals = [];
    this.theme = {};
  }

  parseCleanPages(markdown) {
    const pages = parseDeckPages(markdown);
    this.pages = pages;
    return pages;
  }

  parseVisualComposition(markdown) {
    if (!markdown) return [];
    const visuals = parseVisualSections(markdown).map(section => {
      const archetypeMatch = section.body.match(/archetype[：:]\s*([a-z_]+)/i);
      const protagonistMatch = section.body.match(/(?:visual protagonist|protagonist|视觉主角|主视觉)[：:]\s*(.+)/i);
      const weightMatch = section.body.match(/(?:visual weight|weight|视觉权重)[：:]\s*(.+)/i);
      const chartMatch = section.body.match(/(?:chart|图表)[：:]\s*(.+)/i);

      return {
        pageNum: section.pageNum,
        archetype: archetypeMatch ? archetypeMatch[1].toLowerCase() : 'content',
        protagonist: protagonistMatch ? protagonistMatch[1].trim() : '',
        weight: weightMatch ? weightMatch[1].trim() : '',
        chart: chartMatch ? chartMatch[1].trim() : ''
      };
    });

    this.visuals = visuals;
    return visuals;
  }

  parseThemeTokens(jsonStr) {
    if (typeof jsonStr === 'object' && jsonStr !== null) {
      this.theme = jsonStr;
      return this.theme;
    }
    try {
      this.theme = JSON.parse(jsonStr || '{}');
    } catch (e) {
      this.theme = {};
    }
    return this.theme;
  }

  escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  splitContentBlocks(content) {
    return String(content || '')
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => line.replace(/^[-*•]\s*/, ''));
  }

  inferProtagonist(page, visual = {}) {
    if (visual.protagonist) return visual.protagonist;
    const title = String(page?.title || '');
    const content = String(page?.content || '');
    const archetype = String(visual?.archetype || '').toLowerCase();
    const combined = `${title}\n${content}`;

    if (visual.chart || ['chart', 'comparison', 'matrix'].includes(archetype) || /(增长|趋势|同比|环比|市场|份额|收入|利润|ROI|转化|图表|数据)/i.test(combined)) {
      return `核心数据图表：${title || '关键指标'}`;
    }
    if (['two_column', 'timeline'].includes(archetype) || /(阶段|里程碑|路径|推进|计划|时间|路线图)/i.test(combined)) {
      return `双栏路径图：${title || '行动路径'}`;
    }
    if (['big_number', 'cta'].includes(archetype) || /(目标|结果|关键指标|突破|提升|增长)/i.test(combined)) {
      return `关键数字卡：${title || '核心结果'}`;
    }
    if (/(架构|流程|系统|模块|能力|方案)/i.test(combined)) {
      return `结构示意图：${title || '核心结构'}`;
    }
    return `信息卡组：${title || '核心结论'}`;
  }

  getMergedVisual(page, visuals, layoutManifest = { pages: [] }, assetManifest = { assets: [] }) {
    const layout = layoutManifest.pages.find(item => item.page_id === page.id) || {};
    const visual = visuals.find(v => v.pageNum === page.pageNum) || {};
    const protagonist = visual.protagonist || layout.protagonist || this.inferProtagonist(page, visual);
    return {
      ...visual,
      archetype: visual.archetype || layout.archetype || 'content',
      protagonist,
      weight: visual.weight || layout.weight || '',
      chart: visual.chart || layout.chart || '',
      assets: assetManifest.assets.filter(asset => asset.page_id === page.id)
    };
  }

  buildRenderedSlides(artifacts, projectName = 'PPT Deck Pro Max') {
    const pages = this.parseCleanPages(artifacts.deck_clean_pages);
    const visuals = this.parseVisualComposition(artifacts.deck_visual_composition);
    const theme = this.parseThemeTokens(artifacts.deck_theme_tokens);
    const layoutManifest = artifacts.layout_manifest || { pages: [] };
    const assetManifest = artifacts.asset_manifest || { assets: [] };

    return pages.map((page) => {
      const visual = this.getMergedVisual(page, visuals, layoutManifest, assetManifest);
      return {
        page_id: page.id,
        page_num: page.pageNum,
        title: page.title,
        archetype: visual.archetype || 'content',
        protagonist: visual.protagonist || this.inferProtagonist(page, visual),
        assets: visual.assets,
        html: this.renderBuiltSlide(page, visual, theme, projectName)
      };
    });
  }

  renderBuiltSlide(page, visual, theme, projectName = 'PPT Deck Pro Max') {
    const colors = theme.colors || {};
    const primary = colors.primary || '#6366f1';
    const secondary = colors.secondary || '#8b5cf6';
    const textDark = colors.text_dark || '#0f172a';
    const muted = colors.text_muted || '#64748b';
    const bg = colors.bg || '#ffffff';
    const accentBg = colors.surface || '#eef2ff';
    const blocks = this.splitContentBlocks(page.content);
    const majorPoints = blocks.slice(0, 4);
    const sidePoints = blocks.slice(4, 8);
    const metricText = majorPoints[0] || page.title;
    const assetBadges = (visual.assets || []).slice(0, 3).map(asset => `
      <span style="padding:4px 10px;border-radius:999px;background:rgba(99,102,241,0.12);color:${primary};font-size:12px;font-weight:600;">
        ${this.escapeHtml(asset.type || 'asset')}
      </span>
    `).join('');

    let heroHtml = '';
    const type = String(visual.archetype || '').toLowerCase();

    if (['chart', 'comparison', 'matrix'].includes(type) || visual.chart) {
      heroHtml = `
        <div style="height:100%;display:flex;flex-direction:column;justify-content:center;background:linear-gradient(180deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08));border:1px solid rgba(99,102,241,0.18);border-radius:24px;padding:28px;">
          <div style="font-size:12px;color:${muted};margin-bottom:14px;">${this.escapeHtml(visual.chart || '核心关系图')}</div>
          <div style="display:flex;align-items:flex-end;gap:14px;height:180px;">
            ${[56, 92, 74, 128].map((h, idx) => `
              <div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;gap:8px;">
                <div style="height:${h}px;border-radius:18px 18px 8px 8px;background:${idx % 2 === 0 ? primary : secondary};opacity:${0.88 - idx * 0.12};"></div>
                <div style="font-size:11px;color:${muted};text-align:center;">Q${idx + 1}</div>
              </div>
            `).join('')}
          </div>
          <div style="margin-top:18px;font-size:14px;color:${textDark};font-weight:600;">${this.escapeHtml(visual.protagonist || metricText)}</div>
        </div>
      `;
    } else if (['big_number', 'cta'].includes(type) || /数字|metric|增长|ROI/i.test(visual.protagonist || '')) {
      heroHtml = `
        <div style="height:100%;display:flex;align-items:center;justify-content:center;border-radius:24px;background:linear-gradient(135deg, ${primary}, ${secondary});color:#fff;padding:28px;text-align:center;">
          <div>
            <div style="font-size:14px;opacity:0.75;letter-spacing:0.08em;text-transform:uppercase;">Key Signal</div>
            <div style="font-size:68px;line-height:1;font-weight:800;margin:12px 0;">${this.escapeHtml((metricText.match(/\d[\d.%+-]*/) || ['72%'])[0])}</div>
            <div style="font-size:18px;line-height:1.5;max-width:320px;">${this.escapeHtml(visual.protagonist || metricText)}</div>
          </div>
        </div>
      `;
    } else if (['two_column', 'timeline'].includes(type)) {
      heroHtml = `
        <div style="height:100%;display:grid;grid-template-columns:1fr 1fr;gap:14px;">
          <div style="border-radius:22px;background:${accentBg};padding:22px;border:1px solid rgba(99,102,241,0.12);">
            <div style="font-size:12px;color:${muted};margin-bottom:10px;">Now</div>
            <div style="font-size:15px;color:${textDark};line-height:1.65;">${this.escapeHtml(majorPoints[0] || '当前状态与核心动作')}</div>
          </div>
          <div style="border-radius:22px;background:linear-gradient(180deg, rgba(139,92,246,0.12), rgba(99,102,241,0.08));padding:22px;border:1px solid rgba(139,92,246,0.18);">
            <div style="font-size:12px;color:${muted};margin-bottom:10px;">Next</div>
            <div style="font-size:15px;color:${textDark};line-height:1.65;">${this.escapeHtml(majorPoints[1] || '下一阶段目标与预期结果')}</div>
          </div>
        </div>
      `;
    } else {
      heroHtml = `
        <div style="height:100%;display:flex;flex-direction:column;gap:14px;">
          <div style="border-radius:24px;background:linear-gradient(180deg, rgba(99,102,241,0.10), rgba(99,102,241,0.04));padding:24px;border:1px solid rgba(99,102,241,0.12);">
            <div style="font-size:13px;color:${muted};margin-bottom:8px;">Visual Protagonist</div>
            <div style="font-size:28px;color:${textDark};line-height:1.35;font-weight:700;">${this.escapeHtml(visual.protagonist || page.title)}</div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;">
            ${(majorPoints.slice(0, 4).map((point, idx) => `
              <div style="border-radius:18px;background:${idx % 2 === 0 ? '#ffffff' : accentBg};padding:16px;border:1px solid rgba(148,163,184,0.18);min-height:88px;">
                <div style="font-size:12px;color:${primary};font-weight:700;margin-bottom:8px;">0${idx + 1}</div>
                <div style="font-size:14px;color:${textDark};line-height:1.6;">${this.escapeHtml(point)}</div>
              </div>
            `).join('')) || `
              <div style="border-radius:18px;background:#ffffff;padding:16px;border:1px solid rgba(148,163,184,0.18);min-height:88px;">
                <div style="font-size:14px;color:${textDark};line-height:1.6;">${this.escapeHtml(page.content || '等待内容生成')}</div>
              </div>
            `}
          </div>
        </div>
      `;
    }

    return `
      <div style="width:100%;height:100%;background:${bg};color:${textDark};border-radius:28px;padding:34px 36px;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(15,23,42,0.12);font-family:'Inter','PingFang SC','Microsoft YaHei',sans-serif;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:42px;height:6px;border-radius:999px;background:linear-gradient(90deg, ${primary}, ${secondary});"></div>
            <div style="font-size:12px;color:${muted};letter-spacing:0.08em;text-transform:uppercase;">${this.escapeHtml(type || 'content')}</div>
          </div>
          <div style="font-size:12px;color:${muted};">Slide ${page.pageNum}</div>
        </div>
        <div style="display:grid;grid-template-columns:1.05fr 0.95fr;gap:24px;flex:1;min-height:0;">
          <div style="display:flex;flex-direction:column;min-width:0;">
            <h2 style="font-size:32px;line-height:1.2;font-weight:800;margin:0 0 14px;">${this.escapeHtml(page.title)}</h2>
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;">
              ${assetBadges || `<span style="padding:4px 10px;border-radius:999px;background:rgba(148,163,184,0.12);color:${muted};font-size:12px;">无外部素材</span>`}
            </div>
            <div style="display:flex;flex-direction:column;gap:10px;">
              ${majorPoints.map(point => `
                <div style="display:flex;gap:10px;align-items:flex-start;">
                  <div style="width:8px;height:8px;border-radius:999px;background:${primary};margin-top:8px;flex-shrink:0;"></div>
                  <div style="font-size:15px;line-height:1.65;color:${textDark};">${this.escapeHtml(point)}</div>
                </div>
              `).join('') || `<div style="font-size:15px;line-height:1.65;color:${textDark};">${this.escapeHtml(page.content || '暂无内容')}</div>`}
            </div>
            ${sidePoints.length ? `
              <div style="margin-top:auto;padding-top:18px;border-top:1px solid rgba(148,163,184,0.18);display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;">
                ${sidePoints.slice(0, 4).map(point => `
                  <div style="font-size:12px;line-height:1.6;color:${muted};background:rgba(248,250,252,0.92);border:1px solid rgba(148,163,184,0.12);border-radius:14px;padding:12px;">
                    ${this.escapeHtml(point)}
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
          <div style="min-width:0;min-height:0;">
            ${heroHtml}
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:18px;padding-top:14px;border-top:1px solid rgba(148,163,184,0.18);font-size:12px;color:${muted};">
          <span>${this.escapeHtml(projectName)}</span>
          <span>${this.escapeHtml(visual.protagonist || 'visual-ready')}</span>
        </div>
      </div>
    `;
  }

  renderSlides(pages, visuals, theme, layoutManifest = { pages: [] }, assetManifest = { assets: [] }) {
    if (pages.length === 0) {
      return '<div class="text-center py-12 text-slate-400 text-sm">尚未生成幻灯片内容</div>';
    }

    return pages.map((page, idx) => {
      const mergedVisual = this.getMergedVisual(page, visuals, layoutManifest, assetManifest);
      const archetype = ARCHETYPES[mergedVisual.archetype] || ARCHETYPES.content;
      const builtHtml = this.renderBuiltSlide(page, mergedVisual, theme);

      return `
        <div class="slide-card bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-all" data-page="${page.id}">
          <div class="aspect-video bg-slate-100 overflow-hidden border-b border-slate-200">
            <div style="width:400%;height:400%;transform:scale(0.25);transform-origin:top left;">
              ${builtHtml}
            </div>
          </div>
          <div class="p-4">
            <div class="flex items-center justify-between gap-3 mb-2">
              <div class="text-xs text-slate-400">Slide ${page.pageNum}</div>
              <span class="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">${archetype.name}</span>
            </div>
            <h4 class="font-bold text-sm text-slate-800 mb-1 line-clamp-2">${page.title}</h4>
            <div class="text-[11px] text-slate-500 mb-2">素材 ${mergedVisual.assets.length} 项 · 视觉焦点 ${mergedVisual.protagonist || '待补充'}</div>
            <div class="text-[11px] text-slate-500 line-clamp-3 whitespace-pre-wrap">${page.content || '暂无正文内容'}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  updatePreview(container, artifacts) {
    const builtSlides = artifacts.slide_state?.pages || [];
    const pages = builtSlides.length > 0
      ? builtSlides.map(page => ({
        id: page.page_id,
        pageNum: page.page_num,
        title: page.title,
        content: page.content || ''
      }))
      : this.parseCleanPages(artifacts.deck_clean_pages);
    const visuals = this.parseVisualComposition(artifacts.deck_visual_composition);
    const theme = this.parseThemeTokens(artifacts.deck_theme_tokens);
    const layoutManifest = artifacts.layout_manifest || { pages: [] };
    const assetManifest = artifacts.asset_manifest || { assets: [] };

    if (pages.length === 0) {
      container.innerHTML = '<div class="text-center py-12 text-slate-400 text-sm">尚未生成幻灯片内容<br>请在「Clean Pages」步骤定义页面</div>';
      return;
    }

    container.innerHTML = `
      <div class="space-y-4">
        ${this.renderSlides(pages, visuals, theme, layoutManifest, assetManifest)}
      </div>
    `;

    // Add click handlers
    container.querySelectorAll('.slide-card').forEach(card => {
      card.addEventListener('click', () => {
        const pageId = card.dataset.page;
        const page = pages.find(p => p.id === pageId);
        const visual = page ? this.getMergedVisual(page, visuals, layoutManifest, assetManifest) : null;
        const built = builtSlides.find(item => item.page_id === pageId);
        if (page) {
          this.showSlideModal(page, visual, theme, built?.html);
        }
      });
    });
  }

  showSlideModal(page, visual, theme, builtHtml = '') {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" id="slide-modal-overlay"></div>
      <div class="relative w-full max-w-4xl animate-fade-in">
        <div class="aspect-video rounded-2xl overflow-hidden shadow-2xl bg-slate-100">
          ${builtHtml || this.renderBuiltSlide(page, visual || {}, theme)}
        </div>
        <button id="slide-modal-close" class="absolute -top-3 -right-3 w-8 h-8 bg-white text-slate-600 rounded-full shadow-lg flex items-center justify-center hover:bg-slate-100 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('#slide-modal-overlay').addEventListener('click', () => modal.remove());
    modal.querySelector('#slide-modal-close').addEventListener('click', () => modal.remove());
  }
}

export { SlidePreview, ARCHETYPES };
