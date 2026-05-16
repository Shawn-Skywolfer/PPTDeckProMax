/**
 * Slide Preview — 解析 deck_clean_pages.md + visual_composition.md 渲染 HTML/SVG slides
 */

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
    if (!markdown) return [];
    const pages = [];
    const sections = markdown.split(/(?=^##?\s*P?\d+[:：\.\s])/m);

    sections.forEach(section => {
      const match = section.match(/^##?\s*P?(\d+)[:：\.\s]*(.+)/m);
      if (match) {
        const pageNum = parseInt(match[1]);
        const title = match[2].trim();
        const content = section.replace(/^##?\s*P?\d+[:：\.\s]*.+/m, '').trim();
        pages.push({ id: `slide_${String(pageNum).padStart(2, '0')}`, pageNum, title, content });
      }
    });

    // Fallback: if no structured pages, treat whole markdown as one page
    if (pages.length === 0 && markdown.trim()) {
      pages.push({ id: 'slide_01', pageNum: 1, title: 'Slide 1', content: markdown });
    }

    this.pages = pages;
    return pages;
  }

  parseVisualComposition(markdown) {
    if (!markdown) return [];
    const visuals = [];
    const sections = markdown.split(/(?=^##?\s*P?\d+)/m);

    sections.forEach(section => {
      const match = section.match(/^##?\s*P?(\d+)/m);
      if (match) {
        const pageNum = parseInt(match[1]);
        const archetypeMatch = section.match(/archetype[：:]\s*(\w+)/i);
        const protagonistMatch = section.match(/visual protagonist[：:]\s*(.+)/i);
        const weightMatch = section.match(/weight[：:]\s*(.+)/i);
        const chartMatch = section.match(/chart[：:]\s*(.+)/i);

        visuals.push({
          pageNum,
          archetype: archetypeMatch ? archetypeMatch[1].toLowerCase() : 'content',
          protagonist: protagonistMatch ? protagonistMatch[1].trim() : '',
          weight: weightMatch ? weightMatch[1].trim() : '',
          chart: chartMatch ? chartMatch[1].trim() : ''
        });
      }
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

  renderSlides(pages, visuals, theme, layoutManifest = { pages: [] }, assetManifest = { assets: [] }) {
    if (pages.length === 0) {
      return '<div class="text-center py-12 text-slate-400 text-sm">尚未生成幻灯片内容</div>';
    }

    const colors = theme.colors || {};
    const primary = colors.primary || '#6366f1';
    const secondary = colors.secondary || '#8b5cf6';

    return pages.map((page, idx) => {
      const layout = layoutManifest.pages.find(item => item.page_id === page.id) || {};
      const visual = visuals.find(v => v.pageNum === page.pageNum) || {};
      const mergedVisual = {
        ...visual,
        archetype: visual.archetype || layout.archetype || 'content',
        protagonist: visual.protagonist || layout.protagonist || '',
        assets: assetManifest.assets.filter(asset => asset.page_id === page.id)
      };
      const archetype = ARCHETYPES[mergedVisual.archetype] || ARCHETYPES.content;

      return `
        <div class="slide-card ${archetype.bg} ${archetype.text} p-5 relative group cursor-pointer" data-page="${page.id}">
          <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <span class="text-xs px-2 py-0.5 bg-white/20 rounded-full">${archetype.name}</span>
          </div>
          <div class="h-full flex flex-col">
            <div class="text-xs opacity-60 mb-1">Slide ${page.pageNum}</div>
            <h4 class="font-bold text-sm mb-2 line-clamp-2">${page.title}</h4>
            <div class="text-[11px] opacity-60 mb-2">素材 ${mergedVisual.assets.length} 项</div>
            <div class="flex-1 overflow-hidden">
              ${this.renderVisualPlaceholder(mergedVisual, primary, secondary)}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  renderVisualPlaceholder(visual, primary, secondary) {
    if (!visual.protagonist) {
      return '<div class="text-xs opacity-40 italic">纯文本页面</div>';
    }

    const type = visual.protagonist.toLowerCase();

    if (type.includes('chart') || type.includes('图表') || visual.chart) {
      return `
        <div class="w-full h-24 bg-white/10 rounded-lg flex items-center justify-center">
          <svg class="w-8 h-8 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
          </svg>
        </div>
      `;
    }

    if (type.includes('number') || type.includes('数字') || type.includes('metric')) {
      return `
        <div class="flex items-center justify-center h-24">
          <div class="text-3xl font-bold" style="color: ${primary}">123</div>
        </div>
      `;
    }

    if (type.includes('icon') || type.includes('图标')) {
      return `
        <div class="flex items-center justify-center gap-3 h-24">
          <div class="w-8 h-8 rounded-full bg-white/20"></div>
          <div class="w-8 h-8 rounded-full bg-white/20"></div>
          <div class="w-8 h-8 rounded-full bg-white/20"></div>
        </div>
      `;
    }

    if (type.includes('diagram') || type.includes('架构') || type.includes('flow')) {
      return `
        <div class="flex items-center justify-center h-24">
          <div class="flex items-center gap-2">
            <div class="w-10 h-10 rounded bg-white/20"></div>
            <div class="w-6 h-0.5 bg-white/30"></div>
            <div class="w-10 h-10 rounded bg-white/20"></div>
          </div>
        </div>
      `;
    }

    return `
      <div class="text-xs opacity-60 line-clamp-4">${visual.protagonist}</div>
    `;
  }

  renderSlideDetail(page, visual, theme) {
    const archetype = ARCHETYPES[visual?.archetype] || ARCHETYPES.content;
    const colors = theme?.colors || {};
    const primary = colors.primary || '#6366f1';

    return `
      <div class="aspect-video ${archetype.bg} ${archetype.text} rounded-xl p-8 shadow-lg">
        <div class="h-full flex flex-col">
          <div class="flex items-center justify-between mb-4">
            <div class="text-xs opacity-60">Slide ${page.pageNum}</div>
            <div class="text-xs px-2 py-0.5 bg-white/20 rounded-full">${archetype.name}</div>
          </div>
          <h2 class="text-2xl font-bold mb-4">${page.title}</h2>
          <div class="flex-1 grid grid-cols-2 gap-4">
            <div class="prose prose-sm prose-invert max-w-none">
              ${marked.parse(page.content.substring(0, 500))}
            </div>
            <div class="bg-white/10 rounded-lg p-4 flex items-center justify-center">
              <div class="text-center">
                <div class="text-sm opacity-60 mb-2">Visual Protagonist</div>
                <div class="text-lg font-medium">${visual?.protagonist || '未定义'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  updatePreview(container, artifacts) {
    const pages = this.parseCleanPages(artifacts.deck_clean_pages);
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
        const visual = visuals.find(v => v.pageNum === page?.pageNum);
        if (page) {
          this.showSlideModal(page, visual, theme);
        }
      });
    });
  }

  showSlideModal(page, visual, theme) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" id="slide-modal-overlay"></div>
      <div class="relative w-full max-w-4xl animate-fade-in">
        ${this.renderSlideDetail(page, visual, theme)}
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
