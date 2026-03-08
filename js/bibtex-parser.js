/**
 * bibtex-parser.js — Lightweight BibTeX parser and renderer
 * Reads publications.bib and generates HTML publication cards.
 * Supports two modes:
 *   - preview (N entries, flat): when grid has data-preview="N" attribute
 *   - full (year-grouped + filters): default for publications.html
 */
export class BibtexParser {
  constructor(i18n) {
    this.i18n = i18n;
    this.entries = [];
    this.activeFilter = 'all';
    this.previewCount = null; // set in init() from data-preview attribute
  }

  async init() {
    await this.loadBibtex();
    const container = document.getElementById('publications-grid');
    if (container?.dataset.preview) {
      this.previewCount = parseInt(container.dataset.preview, 10);
    }
    this.render();
    if (!this.previewCount) {
      this.setupFilters();
    }
    this.i18n.onChange(() => this.render());
  }

  async loadBibtex() {
    try {
      const res = await fetch('data/publications.bib');
      const text = await res.text();
      this.entries = this.parse(text);
    } catch (e) {
      console.error('Failed to load BibTeX:', e);
    }
  }

  parse(bibtex) {
    const entries = [];
    const entryRegex = /@(\w+)\s*\{([^,]*),\s*([\s\S]*?)(?=\n@|\n*$)/g;
    let match;

    while ((match = entryRegex.exec(bibtex)) !== null) {
      const type = match[1].toLowerCase();
      const key  = match[2].trim();
      const body = match[3];

      const entry = { type, key, fields: {} };

      const fieldRegex = /(\w+)\s*=\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;
      let fieldMatch;
      while ((fieldMatch = fieldRegex.exec(body)) !== null) {
        const name = fieldMatch[1].toLowerCase();
        let val = fieldMatch[2].trim().replace(/^\{(.+)\}$/, '$1');
        entry.fields[name] = val;
      }

      if (!entry.fields.year) {
        const m = body.match(/year\s*=\s*(\d{4})/);
        if (m) entry.fields.year = m[1];
      }

      entries.push(entry);
    }

    entries.sort((a, b) => {
      const yA = parseInt(a.fields.year) || 0;
      const yB = parseInt(b.fields.year) || 0;
      return yB - yA;
    });

    return entries;
  }

  // ─── type helpers ─────────────────────────────────────────────────────────
  getTypeLabel(entry) {
    const lang = this.i18n.getLang();
    if (entry.type === 'misc') {
      const t = (entry.fields.title || '').toLowerCase();
      if (t.includes('dataset') || t.includes('distribution')) return 'Dataset';
      return 'Preprint';
    }
    if (entry.type === 'inproceedings') {
      const b = (entry.fields.booktitle || '').toLowerCase();
      if (b.includes('poster')) return 'Poster';
      return lang === 'it' ? 'Conferenza' : 'Conference';
    }
    if (entry.type === 'article') return lang === 'it' ? 'Rivista' : 'Journal';
    return entry.type;
  }

  getTypeClass(entry) {
    if (entry.type === 'misc') {
      const t = (entry.fields.title || '').toLowerCase();
      if (t.includes('dataset') || t.includes('distribution')) return 'dataset';
      return 'preprint';
    }
    if (entry.type === 'inproceedings') {
      return (entry.fields.booktitle || '').toLowerCase().includes('poster') ? 'poster' : 'conference';
    }
    if (entry.type === 'article') return 'journal';
    return 'other';
  }

  getFilterType(entry) { return this.getTypeClass(entry); }

  // ─── format helpers ───────────────────────────────────────────────────────
  formatAuthors(authors) {
    if (!authors) return '';
    return authors.split(/\s+and\s+/).map(a => {
      const parts = a.trim().split(',').map(p => p.trim());
      if (parts.length === 2) {
        const [last, first] = parts;
        if (last === 'Giacomelli' || last === 'Giacomeli') {
          return `<strong class="text-cyan-400">${first} ${last}</strong>`;
        }
        return `${first} ${last}`;
      }
      return a.trim();
    }).join(', ');
  }

  buildDoiUrl(doi) {
    if (!doi) return null;
    if (doi.startsWith('http')) return doi;
    return `https://doi.org/${doi}`;
  }

  // ─── SVG icons ────────────────────────────────────────────────────────────
  getDoiIcon()     { return `<svg width="18" height="18" viewBox="0 0 130 130" fill="currentColor" opacity="0.9"><path d="M65 1C29.7 1 1 29.7 1 65s28.7 64 64 64 64-28.7 64-64S100.3 1 65 1zm0 120C33.8 121 9 96.2 9 65S33.8 9 65 9s56 24.8 56 56-24.8 56-56 56z"/><path d="M76 40c-4.4 0-8 3.6-8 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zM54 56H42v38h12V56zm30 0H72v38h12V56zM54 40c-4.4 0-8 3.6-8 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8z"/></svg>`; }
  getArxivIcon()   { return `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2.1 4.7L6.5 12l-4.4 7.3h3.3L9 13l3.6 6.3h3.3L11.5 12l4.4-7.3h-3.3L9 11 5.4 4.7H2.1zm11.4 0L18.1 12l-4.6 7.3h3.3l3-5.1 3 5.1H26l-4.6-7.3 4.6-7.3h-3.3l-3 5.1-3-5.1h-3.2z"/></svg>`; }
  getZenodoIcon()  { return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>`; }
  getIeeeIcon()    { return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`; }
  getGenericIcon() { return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`; }

  detectLinkType(url) {
    if (!url) return 'generic';
    const u = url.toLowerCase();
    if (u.includes('arxiv'))   return 'arxiv';
    if (u.includes('zenodo'))  return 'zenodo';
    if (u.includes('ieee') || u.includes('iscc') || u.includes('is2')) return 'ieee';
    return 'generic';
  }

  buildLinkButton(url, type, label) {
    const icons   = { doi: this.getDoiIcon(), arxiv: this.getArxivIcon(), zenodo: this.getZenodoIcon(), ieee: this.getIeeeIcon(), generic: this.getGenericIcon() };
    const classes = { doi: 'doi-link', arxiv: 'arxiv-link', zenodo: 'zenodo-link', ieee: 'ieee-link', generic: 'url-link' };
    return `<a href="${url}" target="_blank" rel="noopener" class="pub-link ${classes[type] || 'url-link'}" title="${label}">
      ${icons[type] || icons.generic}
      <span class="pub-link-label">${label}</span>
    </a>`;
  }

  // ─── single entry HTML ────────────────────────────────────────────────────
  renderEntry(entry) {
    const f = entry.fields;
    const typeLabel = this.getTypeLabel(entry);
    const typeClass = this.getTypeClass(entry);
    const doiUrl    = this.buildDoiUrl(f.doi);
    const venue     = f.booktitle || f.journal || f.publisher || '';
    const isAccepted    = venue.toLowerCase().includes('accepted');
    const isUnderReview = venue.toLowerCase().includes('under review');

    let statusBadge = '';
    if (isAccepted)    statusBadge = '<span class="pub-status accepted">Accepted</span>';
    if (isUnderReview) statusBadge = '<span class="pub-status review">Under Review</span>';

    let links = '';
    if (doiUrl) {
      const dt = this.detectLinkType(doiUrl);
      links += this.buildLinkButton(doiUrl, dt === 'generic' ? 'doi' : dt, dt === 'arxiv' ? 'arXiv' : dt === 'zenodo' ? 'Zenodo' : 'DOI');
    }
    if (f.url) {
      const ut    = this.detectLinkType(f.url);
      const uLabel = ut === 'arxiv' ? 'arXiv' : ut === 'zenodo' ? 'Zenodo' : ut === 'ieee' ? 'IEEE' : 'Link';
      const doiType = doiUrl ? this.detectLinkType(doiUrl) : '';
      if (ut !== doiType || !doiUrl) links += this.buildLinkButton(f.url, ut, uLabel);
    }

    return `
      <article class="pub-card glass-card" data-type="${typeClass}">
        <div class="pub-header">
          <span class="pub-type ${typeClass}">${typeLabel}</span>
          <span class="pub-year">${f.year || ''}</span>
        </div>
        <h3 class="pub-title">${f.title || ''}</h3>
        <p class="pub-authors">${this.formatAuthors(f.author)}</p>
        <p class="pub-venue">
          <em>${venue}</em>
          ${statusBadge}
        </p>
        <div class="pub-links">${links}</div>
      </article>`;
  }

  // ─── render ───────────────────────────────────────────────────────────────
  render() {
    const container = document.getElementById('publications-grid');
    if (!container) return;

    let entries = this.activeFilter === 'all'
      ? this.entries
      : this.entries.filter(e => this.getFilterType(e) === this.activeFilter);

    if (this.previewCount) {
      // Homepage preview: flat list, N most recent
      container.innerHTML = entries.slice(0, this.previewCount).map(e => this.renderEntry(e)).join('');
      return;
    }

    // Full page: insert year-group separators
    const html = [];
    let lastYear = null;

    for (const entry of entries) {
      const year = entry.fields.year || '';
      if (year !== lastYear) {
        html.push(`<div class="pub-year-divider"><span>${year || '—'}</span></div>`);
        lastYear = year;
      }
      html.push(this.renderEntry(entry));
    }

    container.innerHTML = html.join('');
  }

  // ─── filter buttons ───────────────────────────────────────────────────────
  setupFilters() {
    document.querySelectorAll('.pub-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeFilter = btn.dataset.filter;
        document.querySelectorAll('.pub-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.render();
      });
    });
  }
}
