/**
 * PPTX Builder — Backend probe + PptxGenJS fallback
 */

import { providerManager } from './providerManager.js';
import { parseDeckPages } from './deckParsers.js';

const BACKEND_URL = 'http://localhost:8765';
const PPTXGEN_BUNDLE_URL = 'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js';

class PPTXBuilder {
  constructor() {
    this.backendAvailable = false;
    this.capabilities = { pptx: false, screenshot: false, montage: false };
  }

  async probeBackend() {
    try {
      const res = await fetch(`${BACKEND_URL}/api/health`, { method: 'GET', signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const data = await res.json();
        this.backendAvailable = true;
        this.capabilities = data.capabilities || {};
        return { available: true, capabilities: this.capabilities };
      }
    } catch (err) {
      // Backend not running
    }
    this.backendAvailable = false;
    return { available: false, capabilities: {} };
  }

  async buildPPTX(project) {
    const probe = await this.probeBackend();

    if (probe.available && probe.capabilities.pptx) {
      return this._buildViaBackend(project);
    } else {
      return this._buildViaBrowser(project);
    }
  }

  async _buildViaBackend(project) {
    try {
      const slides = this._prepareSlides(project);
      const theme = this._parseTheme(project.artifacts.deck_theme_tokens);

      const res = await fetch(`${BACKEND_URL}/api/build-pptx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: project.id,
          theme_tokens: theme,
          slides,
          output_mode: project.outputMode
        })
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const blob = await res.blob();
      this._downloadBlob(blob, `${project.name}.pptx`);
      return { success: true, method: 'backend' };
    } catch (err) {
      console.warn('Backend build failed, falling back to browser:', err);
      return this._buildViaBrowser(project);
    }
  }

  async _buildViaBrowser(project) {
    try {
      const PptxCtor = await this._ensurePptxConstructor();
      const pptx = new PptxCtor();
      pptx.layout = 'LAYOUT_16x9';

      const theme = this._parseTheme(project.artifacts.deck_theme_tokens);
      const colors = theme.colors || {};
      const primary = this._normalizePptxColor(colors.primary, '6366f1');
      const textDark = this._normalizePptxColor(colors.text_dark, '1e293b');

      pptx.defineSlideMaster({
        title: 'MASTER_SLIDE',
        background: { color: 'FFFFFF' }
      });

      const pages = this._parsePages(project.artifacts.deck_clean_pages);
      pages.forEach((page, idx) => {
        const slide = pptx.addSlide();
        slide.background = { color: idx === 0 ? primary : 'FFFFFF' };

        // Title
        slide.addText(page.title, {
          x: 0.5, y: 0.3, w: '90%', h: 0.8,
          fontSize: idx === 0 ? 32 : 24,
          color: idx === 0 ? 'FFFFFF' : textDark,
          bold: true,
          fontFace: 'Microsoft YaHei'
        });

        // Content
        if (page.content) {
          slide.addText(page.content.substring(0, 800), {
            x: 0.5, y: 1.2, w: '90%', h: 5,
            fontSize: 14,
            color: idx === 0 ? 'FFFFFF' : textDark,
            fontFace: 'Microsoft YaHei'
          });
        }
      });

      await pptx.writeFile({ fileName: `${project.name}.pptx` });
      return { success: true, method: 'browser' };
    } catch (err) {
      console.error('Browser PPTX build failed:', err);
      return { success: false, error: err.message };
    }
  }

  async buildMontage(project) {
    const probe = await this.probeBackend();
    if (!probe.available || !probe.capabilities.montage) {
      return { success: false, error: 'Backend not available for montage' };
    }

    try {
      const pages = this._parsePages(project.artifacts.deck_clean_pages);
      if (pages.length === 0) {
        return { success: false, error: 'No pages found for montage' };
      }

      // Capture screenshots for each slide
      const screenshots = [];
      for (const page of pages) {
        const html = this._generateSlideHtml(page, project);
        const res = await fetch(`${BACKEND_URL}/api/capture-screenshot`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            html,
            width: 1280,
            height: 720
          })
        });
        if (!res.ok) throw new Error(`Screenshot failed for ${page.id}: HTTP ${res.status}`);
        screenshots.push(await res.blob());
      }

      // Build montage from screenshots
      const formData = new FormData();
      screenshots.forEach((blob, idx) => {
        formData.append('images', blob, `slide_${String(idx + 1).padStart(2, '0')}.png`);
      });
      const cols = Math.min(3, pages.length);
      const rows = Math.ceil(pages.length / cols);
      formData.append('layout', JSON.stringify({ rows, cols, padding: 12 }));

      const montageRes = await fetch(`${BACKEND_URL}/api/build-montage`, {
        method: 'POST',
        body: formData
      });
      if (!montageRes.ok) throw new Error(`Montage build failed: HTTP ${montageRes.status}`);

      const blob = await montageRes.blob();
      this._downloadBlob(blob, `${project.name}_montage.png`);
      return { success: true, method: 'backend', slideCount: pages.length };
    } catch (err) {
      console.error('Montage build failed:', err);
      return { success: false, error: err.message };
    }
  }

  _generateSlideHtml(page, project) {
    const theme = this._parseTheme(project.artifacts.deck_theme_tokens);
    const colors = theme.colors || {};
    const primary = colors.primary || '#6366f1';
    const textDark = colors.text_dark || '#1e293b';
    const bg = colors.bg || '#ffffff';

    const lines = page.content.split('\n').filter(l => l.trim());
    const listItems = lines.map(l => {
      const trimmed = l.trim().replace(/^[-*•]\s*/, '');
      if (!trimmed) return '';
      return `<li style="margin: 6px 0; line-height: 1.5;">${trimmed}</li>`;
    }).join('');

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  width: 1280px; height: 720px;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  background: ${bg};
  padding: 48px 56px;
  display: flex;
  flex-direction: column;
}
.header-bar {
  width: 48px; height: 6px;
  background: ${primary};
  border-radius: 3px;
  margin-bottom: 20px;
}
h1 {
  font-size: 36px;
  font-weight: 700;
  color: ${textDark};
  margin-bottom: 32px;
  line-height: 1.3;
}
ul {
  font-size: 20px;
  color: ${textDark};
  list-style: none;
  padding: 0;
}
ul li::before {
  content: "•";
  color: ${primary};
  font-weight: bold;
  display: inline-block;
  width: 1.2em;
  margin-left: -1.2em;
}
.footer {
  margin-top: auto;
  font-size: 14px;
  color: #94a3b8;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
}
</style>
</head>
<body>
<div class="header-bar"></div>
<h1>${page.title}</h1>
<ul>${listItems}</ul>
<div class="footer">${project.name || 'PPT Deck Pro Max'}</div>
</body>
</html>`;
  }

  _prepareSlides(project) {
    const pages = this._parsePages(project.artifacts.deck_clean_pages);
    const layoutPages = project.artifacts.layout_manifest?.pages || [];
    return pages.map(p => ({
      ...(layoutPages.find(page => page.page_id === p.id) || {}),
      page_id: p.id,
      title: p.title,
      content_html: p.content.replace(/\n/g, '<br>'),
      layout: this._mapArchetypeToLayout(layoutPages.find(page => page.page_id === p.id)?.archetype)
    }));
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

  _mapArchetypeToLayout(archetype = 'content') {
    const value = String(archetype || 'content').toLowerCase();
    if (['chart', 'comparison', 'matrix'].includes(value)) return 'chart';
    if (['two_column', 'timeline'].includes(value)) return 'two_column';
    if (['title', 'cover', 'cta'].includes(value)) return 'title';
    return 'content';
  }

  _downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  _resolvePptxConstructor() {
    const candidates = [
      globalThis.PptxGenJS,
      globalThis.PptxGenJS?.default,
      globalThis.pptxgen,
      globalThis.pptxgen?.default,
      globalThis.pptxgenjs,
      globalThis.pptxgenjs?.default
    ];

    return candidates.find(candidate => typeof candidate === 'function') || null;
  }

  _normalizePptxColor(value, fallback) {
    const normalized = String(value || fallback || '').trim().replace(/^#/, '');
    return /^[0-9a-fA-F]{6}$/.test(normalized) ? normalized : fallback;
  }

  async _ensurePptxConstructor() {
    let ctor = this._resolvePptxConstructor();
    if (ctor) return ctor;

    await this._loadScript(PPTXGEN_BUNDLE_URL);
    ctor = this._resolvePptxConstructor();
    if (ctor) return ctor;

    throw new Error('PptxGenJS browser bundle loaded, but no constructor was found');
  }

  _loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        if (existing.dataset.loaded === 'true') {
          resolve();
          return;
        }
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.onload = () => {
        script.dataset.loaded = 'true';
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
}

export const pptxBuilder = new PPTXBuilder();
