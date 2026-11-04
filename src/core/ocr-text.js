// OCR text clean-up and extraction. Pure logic, no DOM.
import { normalizeWhitespace, escapeHtml } from './text.js';

const TERMINAL = /[.!?:;)"']$/;
const BULLET = /^([-*•·]|\d+[.)])\s+/;

export function cleanOcrText(raw) {
  let t = String(raw ?? '').replace(/\r\n?/g, '\n').replace(/\u00ad/g, '').replace(/\u00a0/g, ' ');
  t = t.replace(/([A-Za-z])-\n([a-z])/g, '$1$2'); // join words hyphenated across lines
  const lines = t
    .split('\n')
    .map((l) => l.replace(/[ \t]+/g, ' ').trim())
    .filter((l) => l === '' || !isNoiseLine(l));
  // join wrapped lines inside a paragraph, keep blank lines as paragraph breaks
  const out = [];
  let current = '';
  for (const line of lines) {
    if (line === '') {
      if (current) out.push(current);
      current = '';
      if (out.length && out[out.length - 1] !== '') out.push('');
      continue;
    }
    if (!current) {
      current = line;
    } else if (!TERMINAL.test(current) && !BULLET.test(line) && !/^[A-Z][a-z]+:/.test(line)) {
      current += ' ' + line;
    } else {
      out.push(current);
      current = line;
    }
  }
  if (current) out.push(current);
  return normalizeWhitespace(out.join('\n'));
}

export function isNoiseLine(line) {
  const s = String(line).trim();
  if (!s) return false;
  if (/[A-Za-z0-9]/.test(s)) return false;
  return s.length <= 3;
}

const RE_EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g;
const RE_URL = /(?:https?:\/\/|www\.)[^\s)<>"']+/g;
const RE_DATE = /\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b/g;
const RE_AMOUNT = /(?:₹|Rs\.?|INR|\$|€|£)\s?\d[\d,]*(?:\.\d{1,2})?|\b\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?\b|\b\d+\.\d{2}\b/g;
const RE_PHONE = /\+?\d[\d\s()-]{6,}\d/g;

export function extractEntities(text) {
  const t = String(text ?? '');
  const uniq = (arr) => [...new Set(arr.map((x) => x.trim()))];
  const phones = uniq((t.match(RE_PHONE) || []).filter((p) => /^\d{8,15}$/.test(p.replace(/\D/g, ''))));
  const totals = t
    .split('\n')
    .filter((l) => /\b(grand total|total due|amount due|total)\b/i.test(l) && /\d/.test(l))
    .map((l) => l.trim());
  return {
    emails: uniq(t.match(RE_EMAIL) || []),
    urls: uniq((t.match(RE_URL) || []).map((u) => u.replace(/[.,;]+$/, ''))),
    phones,
    dates: uniq(t.match(RE_DATE) || []),
    amounts: uniq(t.match(RE_AMOUNT) || []),
    totals,
  };
}

export function structureText(text) {
  const lines = String(text ?? '').split('\n');
  const blocks = [];
  let para = [];
  const flush = () => {
    if (para.length) blocks.push({ type: 'paragraph', text: para.join(' ') });
    para = [];
  };
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return flush();
    if (BULLET.test(line)) {
      flush();
      const last = blocks[blocks.length - 1];
      const item = line.replace(BULLET, '');
      if (last && last.type === 'list') last.items.push(item);
      else blocks.push({ type: 'list', items: [item] });
      return;
    }
    const next = (lines[i + 1] || '').trim();
    const isHeading = line.length <= 60 && !TERMINAL.test(line) && /[A-Za-z]/.test(line) &&
      (line === line.toUpperCase() || (next !== '' && !TERMINAL.test(line) && line.split(' ').every((w) => /^[A-Z0-9]/.test(w))));
    if (isHeading && (next === '' || next.length > 0) && line.split(' ').length <= 8) {
      flush();
      blocks.push({ type: 'heading', text: line });
      return;
    }
    para.push(line);
  });
  flush();
  return blocks;
}

export function computeStats(text, confidence = null) {
  const t = String(text ?? '');
  const words = (t.match(/\S+/g) || []).length;
  const lines = t ? t.split('\n').length : 0;
  const conf = typeof confidence === 'number' && Number.isFinite(confidence) ? Math.round(confidence) : null;
  return {
    words,
    characters: t.length,
    lines,
    confidence: conf,
    lowConfidence: conf !== null && conf < 60,
  };
}

export function buildCleanupPrompt(text) {
  const body = normalizeWhitespace(text);
  if (!body) throw new Error('There is no text to clean up yet. Read an image first.');
  return [
    {
      role: 'system',
      content: 'You clean up text produced by OCR. Fix only clear OCR mistakes (split or merged words, stray characters). ' +
        'Keep every number, amount, date, name and email exactly as it is. Do not add or invent content. ' +
        'Return the cleaned text only, with the same paragraphs.',
    },
    { role: 'user', content: body },
  ];
}

export function renderTextHtml(blocks) {
  if (!blocks.length) return '<p class="muted">No text found.</p>';
  return blocks
    .map((b) => {
      if (b.type === 'heading') return `<h3 style="font-size:1rem;margin:14px 0 4px">${escapeHtml(b.text)}</h3>`;
      if (b.type === 'list') return `<ul class="list">${b.items.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>`;
      return `<p>${escapeHtml(b.text)}</p>`;
    })
    .join('');
}
