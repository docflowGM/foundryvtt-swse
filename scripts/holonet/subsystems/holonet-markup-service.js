/**
 * Holonet Markup Service
 *
 * Safe lightweight renderer for GM-authored Holonet text.
 * Full autocomplete/entity resolution is intentionally deferred; this service
 * provides the durable rendering seam for @, #, !, and +credits tokens.
 */
export class HolonetMarkupService {
  static TOKEN_PATTERN = /(@[\p{L}\p{N}_.'-]+(?:\s+[\p{L}\p{N}_.'-]+)*|#[\p{L}\p{N}_-]+|![\p{L}\p{N}_-]+|\+\d[\d,]*(?:cr|credits)?)/giu;

  static escapeHTML(value = '') {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  static classifyToken(raw = '') {
    if (raw.startsWith('@')) return 'mention';
    if (raw.startsWith('#')) return 'tag';
    if (raw.startsWith('!')) return 'alert';
    if (raw.startsWith('+')) return 'reward';
    return 'text';
  }

  static renderToken(raw = '') {
    const safe = this.escapeHTML(raw);
    const tokenType = this.classifyToken(raw);
    if (tokenType === 'text') return safe;
    return `<span class="holonet-token holonet-token--${tokenType}">${safe}</span>`;
  }

  static render(text = '') {
    const source = String(text ?? '');
    let cursor = 0;
    let html = '';

    for (const match of source.matchAll(this.TOKEN_PATTERN)) {
      const token = match[0];
      const index = match.index ?? 0;
      if (index > cursor) html += this.escapeHTML(source.slice(cursor, index));
      html += this.renderToken(token);
      cursor = index + token.length;
    }

    if (cursor < source.length) html += this.escapeHTML(source.slice(cursor));
    return html.replace(/\n/g, '<br>');
  }

  static preview(text = '', length = 160) {
    const source = String(text ?? '');
    const trimmed = source.length > length ? `${source.slice(0, length).trimEnd()}…` : source;
    return this.render(trimmed);
  }

  static extractTokens(text = '') {
    return Array.from(String(text ?? '').matchAll(this.TOKEN_PATTERN), (match) => ({
      raw: match[0],
      type: this.classifyToken(match[0]),
      index: match.index ?? 0
    }));
  }
}
