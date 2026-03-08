/**
 * bibtex-parser.js — Lightweight BibTeX parser and renderer
 * Reads publications.bib and generates HTML publication cards
 */
export class BibtexParser {
  constructor(i18n) {
    this.i18n = i18n;
    this.entries = [];
    this.activeFilter = 'all';
  }

  async init() {
    await this.loadBibtex();
    this.render();
    this.setupFilters();

    // Re-render on language change
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
    // Match each @type{key, ... } block
    const entryRegex = /@(\w+)\s*\{([^,]*),\s*([\s\S]*?)(?=\n@|\n*$)/g;
    let match;

    while ((match = entryRegex.exec(bibtex)) !== null) {
      const type = match[1].toLowerCase();
      const key = match[2].trim();
      const body = match[3];

      const entry = { type, key, fields: {} };

      // Parse fields
      const fieldRegex = /(\w+)\s*=\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;
      let fieldMatch;
      while ((fieldMatch = fieldRegex.exec(body)) !== null) {
        const fieldName = fieldMatch[1].toLowerCase();
        let fieldValue = fieldMatch[2].trim();
        // Remove double braces from titles
        fieldValue = fieldValue.replace(/^\{(.+)\}$/, '$1');
        entry.fields[fieldName] = fieldValue;
      }

      // Parse year without braces (e.g., year = 2025)
      if (!entry.fields.year) {
        const yearPlain = body.match(/year\s*=\s*(\d{4})/);
        if (yearPlain) entry.fields.year = yearPlain[1];
      }

      entries.push(entry);
    }

    // Sort by year descending
    entries.sort((a, b) => {
      const yA = parseInt(a.fields.year) || 0;
      const yB = parseInt(b.fields.year) || 0;
      return yB - yA;
    });

    return entries;
  }

  getTypeLabel(entry) {
    const lang = this.i18n.getLang();

    // Determine more specific type
    if (entry.type === 'misc') {
      const title = (entry.fields.title || '').toLowerCase();
      if (title.includes('dataset') || title.includes('distribution')) {
        return lang === 'it' ? 'Dataset' : 'Dataset';
      }
      return lang === 'it' ? 'Preprint' : 'Preprint';
    }

    if (entry.type === 'inproceedings') {
      const booktitle = (entry.fields.booktitle || '').toLowerCase();
      if (booktitle.includes('poster')) {
        return lang === 'it' ? 'Poster' : 'Poster';
      }
      return lang === 'it' ? 'Conferenza' : 'Conference';
    }

    if (entry.type === 'article') {
      return lang === 'it' ? 'Rivista' : 'Journal';
    }

    return entry.type;
  }

  getTypeClass(entry) {
    if (entry.type === 'misc') {
      const title = (entry.fields.title || '').toLowerCase();
      if (title.includes('dataset') || title.includes('distribution')) return 'dataset';
      return 'preprint';
    }
    if (entry.type === 'inproceedings') {
      const booktitle = (entry.fields.booktitle || '').toLowerCase();
      if (booktitle.includes('poster')) return 'poster';
      return 'conference';
    }
    if (entry.type === 'article') return 'journal';
    return 'other';
  }

  getFilterType(entry) {
    return this.getTypeClass(entry);
  }

  formatAuthors(authors) {
    if (!authors) return '';
    // Split by "and"
    const authorList = authors.split(/\s+and\s+/).map(a => {
      const parts = a.trim().split(',').map(p => p.trim());
      if (parts.length === 2) {
        const last = parts[0];
        const first = parts[1];
        // Highlight Stefano
        if (last === 'Giacomelli' || last === 'Giacomeli') {
          return `<strong class="text-cyan-400">${first} ${last}</strong>`;
        }
        return `${first} ${last}`;
      }
      return a.trim();
    });

    return authorList.join(', ');
  }

  buildDoiUrl(doi) {
    if (!doi) return null;
    if (doi.startsWith('http')) return doi;
    return `https://doi.org/${doi}`;
  }

  // SVG icons for publication links
  getDoiIcon() {
    // DOI logo
    return `<svg width="18" height="18" viewBox="0 0 130 130" fill="currentColor" opacity="0.9"><path d="M65 1C29.7 1 1 29.7 1 65s28.7 64 64 64 64-28.7 64-64S100.3 1 65 1zm0 120C33.8 121 9 96.2 9 65S33.8 9 65 9s56 24.8 56 56-24.8 56-56 56z"/><path d="M76 40c-4.4 0-8 3.6-8 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zM54 56H42v38h12V56zm30 0H72v38h12V56zM54 40c-4.4 0-8 3.6-8 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8z"/></svg>`;
  }

  getArxivIcon() {
    // ArXiv stylized icon
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2.1 4.7L6.5 12l-4.4 7.3h3.3L9 13l3.6 6.3h3.3L11.5 12l4.4-7.3h-3.3L9 11 5.4 4.7H2.1zm11.4 0L18.1 12l-4.6 7.3h3.3l3-5.1 3 5.1H26l-4.6-7.3 4.6-7.3h-3.3l-3 5.1-3-5.1h-3.2z"/></svg>`;
  }

  getZenodoIcon() {
    // Zenodo database icon
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>`;
  }

  getIeeeIcon() {
    // IEEE / Conference link icon
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`;
  }

  getGenericLinkIcon() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;
  }

  detectLinkType(url) {
    if (!url) return 'generic';
    const u = url.toLowerCase();
    if (u.includes('arxiv')) return 'arxiv';
    if (u.includes('zenodo')) return 'zenodo';
    if (u.includes('ieee') || u.includes('iscc') || u.includes('is2')) return 'ieee';
    if (u.includes('researchcatalogue')) return 'generic';
    return 'generic';
  }

  buildLinkButton(url, type, label) {
    const icons = {
      doi: this.getDoiIcon(),
      arxiv: this.getArxivIcon(),
      zenodo: this.getZenodoIcon(),
      ieee: this.getIeeeIcon(),
      generic: this.getGenericLinkIcon(),
    };
    const classes = {
      doi: 'doi-link',
      arxiv: 'arxiv-link',
      zenodo: 'zenodo-link',
      ieee: 'ieee-link',
      generic: 'url-link',
    };
    return `<a href="${url}" target="_blank" rel="noopener" class="pub-link ${classes[type] || 'url-link'}" title="${label}">
      ${icons[type] || icons.generic}
      <span class="pub-link-label">${label}</span>
    </a>`;
  }

  render() {
    const container = document.getElementById('publications-grid');
    if (!container) return;

    const filtered = this.activeFilter === 'all'
      ? this.entries
      : this.entries.filter(e => this.getFilterType(e) === this.activeFilter);

    container.innerHTML = filtered.map(entry => {
      const f = entry.fields;
      const typeLabel = this.getTypeLabel(entry);
      const typeClass = this.getTypeClass(entry);
      const doiUrl = this.buildDoiUrl(f.doi);
      const venue = f.booktitle || f.journal || f.publisher || '';
      const isAccepted = venue.toLowerCase().includes('accepted');
      const isUnderReview = venue.toLowerCase().includes('under review');

      let statusBadge = '';
      if (isAccepted) statusBadge = '<span class="pub-status accepted">Accepted</span>';
      if (isUnderReview) statusBadge = '<span class="pub-status review">Under Review</span>';

      // Build smart links
      let links = '';
      if (doiUrl) {
        // Detect if DOI points to arxiv, zenodo, ieee, etc.
        const doiType = this.detectLinkType(doiUrl);
        const doiLabel = doiType === 'arxiv' ? 'arXiv' : doiType === 'zenodo' ? 'Zenodo' : 'DOI';
        links += this.buildLinkButton(doiUrl, doiType === 'generic' ? 'doi' : doiType, doiLabel);
      }
      if (f.url) {
        const urlType = this.detectLinkType(f.url);
        const urlLabel = urlType === 'arxiv' ? 'arXiv' : urlType === 'zenodo' ? 'Zenodo' : urlType === 'ieee' ? 'IEEE' : 'Link';
        // Avoid duplicate if DOI and URL point to same service
        const doiType = doiUrl ? this.detectLinkType(doiUrl) : '';
        if (urlType !== doiType || !doiUrl) {
          links += this.buildLinkButton(f.url, urlType, urlLabel);
        }
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
          <div class="pub-links">
            ${links}
          </div>
        </article>
      `;
    }).join('');
  }

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
