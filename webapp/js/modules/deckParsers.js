/**
 * Shared parsers for markdown-based deck artifacts.
 */

function normalizeMarkdown(markdown) {
  return String(markdown || '').replace(/\r\n/g, '\n').trim();
}

function stripBulletPrefix(line) {
  return line.replace(/^[-*•]\s*/, '');
}

function matchExplicitPageHeading(line) {
  const normalized = stripBulletPrefix(String(line || '').trim()).replace(/[|｜]/g, ' ');
  return normalized.match(/^#{0,3}\s*(?:P(?:age)?|Slide)\s*(\d{1,3})[\s:：.\-、]*([^]*)$/i) ||
    normalized.match(/^#{0,3}\s*第\s*(\d{1,3})\s*页[\s:：.\-、]*([^]*)$/i) ||
    normalized.match(/^#{0,3}\s*(\d{1,3})[\s:：.\-、]+(.+)$/);
}

function matchGenericHeading(line) {
  return line.match(/^#{1,2}\s+(.+)$/);
}

function buildPageObject(index, title, content) {
  const pageNum = index + 1;
  return {
    id: `slide_${String(pageNum).padStart(2, '0')}`,
    pageNum,
    title: title || `Slide ${pageNum}`,
    content: content.trim()
  };
}

function buildNumberedPageObject(pageNum, title, content, index) {
  const normalizedPageNum = Number.isFinite(pageNum) && pageNum > 0 ? pageNum : index + 1;
  return {
    id: `slide_${String(normalizedPageNum).padStart(2, '0')}`,
    pageNum: normalizedPageNum,
    title: title || `Slide ${normalizedPageNum}`,
    content: content.trim()
  };
}

export function parseDeckPages(markdown) {
  const source = normalizeMarkdown(markdown);
  if (!source) return [];

  const lines = source.split('\n');
  const explicitPages = [];
  let currentPage = null;

  lines.forEach((line) => {
    const explicitMatch = matchExplicitPageHeading(line.trim());
    if (explicitMatch) {
      if (currentPage) explicitPages.push(currentPage);
      currentPage = {
        pageNum: parseInt(explicitMatch[1], 10),
        title: (explicitMatch[2] || '').trim(),
        lines: []
      };
      return;
    }

    if (currentPage) {
      currentPage.lines.push(line);
    }
  });

  if (currentPage) explicitPages.push(currentPage);

  if (explicitPages.length > 0) {
    return explicitPages.map((page, index) => buildNumberedPageObject(
      page.pageNum,
      page.title,
      page.lines.join('\n'),
      index
    ));
  }

  const genericPages = [];
  currentPage = null;

  lines.forEach((line) => {
    const genericMatch = matchGenericHeading(line.trim());
    if (genericMatch) {
      if (currentPage) genericPages.push(currentPage);
      currentPage = {
        title: genericMatch[1].trim(),
        lines: []
      };
      return;
    }

    if (currentPage) {
      currentPage.lines.push(line);
    }
  });

  if (currentPage) genericPages.push(currentPage);

  if (genericPages.length > 0) {
    return genericPages.map((page, index) => buildPageObject(index, page.title, page.lines.join('\n')));
  }

  return [buildPageObject(0, 'Slide 1', source)];
}

export function parseVisualSections(markdown) {
  const source = normalizeMarkdown(markdown);
  if (!source) return [];

  const lines = source.split('\n');
  const sections = [];
  let current = null;

  const pushCurrent = () => {
    if (!current) return;
    sections.push({
      pageNum: current.pageNum,
      title: current.title,
      body: current.lines.join('\n').trim()
    });
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    const explicitMatch = matchExplicitPageHeading(trimmed);
    const genericMatch = matchGenericHeading(trimmed);
    if (explicitMatch || genericMatch) {
      pushCurrent();
      current = {
        pageNum: explicitMatch ? parseInt(explicitMatch[1], 10) : null,
        title: explicitMatch ? (explicitMatch[2] || '').trim() : genericMatch[1].trim(),
        lines: []
      };
      return;
    }

    if (current) current.lines.push(line);
  });

  pushCurrent();

  return sections.map((section, index) => ({
    ...section,
    pageNum: section.pageNum || index + 1
  }));
}
