import { cleanOcrText, extractEntities, structureText, computeStats, buildCleanupPrompt, renderTextHtml } from './core/ocr-text.js';
import { createLLMClient } from './core/llm.js';
import { isLive } from './core/settings.js';
import { escapeHtml } from './core/text.js';
import { initSettings } from './ui/settings-panel.js';
import { readImage } from './ocr-engine.js';

const SETTINGS_KEY = 'ai-ocr-reader:settings';
const $ = (id) => document.getElementById(id);
const settings = initSettings({ storageKey: SETTINGS_KEY });
let lastRaw = '';

function setError(msg) {
  $('error').textContent = msg;
  $('error').hidden = !msg;
}

function render(cleaned, confidence) {
  const stats = computeStats(cleaned, confidence);
  const ent = extractEntities(cleaned);
  const chips = [
    `<span class="stat">${stats.words} words</span>`,
    stats.confidence !== null ? `<span class="stat">${stats.confidence}% confidence${stats.lowConfidence ? ' (low: check the image)' : ''}</span>` : '',
  ].join('');
  const found = [
    ['Emails', ent.emails], ['Phone numbers', ent.phones], ['Links', ent.urls],
    ['Dates', ent.dates], ['Amounts', ent.amounts], ['Totals', ent.totals],
  ].filter(([, v]) => v.length)
    .map(([k, v]) => `<div class="item"><strong>${escapeHtml(k)}</strong><div class="meta">${v.map(escapeHtml).join(' · ')}</div></div>`)
    .join('') || '<p class="muted">No emails, dates, amounts or links found.</p>';
  $('output').innerHTML = `<div class="stats">${chips}</div>${renderTextHtml(structureText(cleaned))}<h3 style="font-size:1rem;margin:16px 0 4px">Found in the text</h3>${found}`;
}

$('file').addEventListener('change', async (event) => {
  const file = event.target.files && event.target.files[0];
  setError('');
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    setError('Choose an image file (PNG, JPG or WebP).');
    return;
  }
  $('preview').src = URL.createObjectURL(file);
  $('preview').alt = `Preview of ${file.name}`;
  $('preview').hidden = false;
  $('status').textContent = 'Reading text… the first run loads the OCR engine.';
  try {
    const { text, confidence } = await readImage(file);
    lastRaw = text;
    $('raw').value = text;
    const cleaned = cleanOcrText(text);
    render(cleaned, confidence);
    $('status').textContent = cleaned ? 'Done. Text found.' : 'Done. No text found in this image.';
    $('tidy').disabled = !cleaned;
  } catch (err) {
    setError(`Could not read this image: ${err.message || 'unknown error'}`);
    $('status').textContent = '';
  }
});

$('tidy').addEventListener('click', async () => {
  setError('');
  const cfg = settings.get();
  if (!isLive(cfg)) {
    setError('Tidy with model needs Live mode. Open Settings, choose Live and add your endpoint.');
    return;
  }
  const button = $('tidy');
  button.disabled = true;
  button.textContent = 'Working…';
  try {
    const client = createLLMClient({ baseUrl: cfg.baseUrl, apiKey: cfg.apiKey, model: cfg.model });
    const reply = await client.chat(buildCleanupPrompt(lastRaw || $('raw').value), { temperature: 0 });
    render(cleanOcrText(reply), null);
    $('status').textContent = 'Cleaned with your model.';
  } catch (err) {
    setError(err.message || 'Something went wrong.');
  } finally {
    button.disabled = false;
    button.textContent = 'Tidy with model';
  }
});

$('raw').addEventListener('input', () => {
  lastRaw = $('raw').value;
  if (lastRaw.trim()) {
    render(cleanOcrText(lastRaw), null);
    $('tidy').disabled = false;
  }
});
