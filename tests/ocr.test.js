import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as O from '../src/core/ocr-text.js';

test('cleanOcrText joins words hyphenated across lines', () => {
  assert.equal(O.cleanOcrText('invoi-\nce ready'), 'invoice ready');
});
test('cleanOcrText joins a wrapped sentence into one line', () => {
  assert.equal(O.cleanOcrText('This is a long\nsentence that wraps.'), 'This is a long sentence that wraps.');
});
test('cleanOcrText keeps blank lines as paragraph breaks', () => {
  assert.equal(O.cleanOcrText('First para.\n\nSecond para.'), 'First para.\n\nSecond para.');
});
test('cleanOcrText drops symbol-only noise lines', () => {
  assert.equal(O.cleanOcrText('Real text here.\n|\n~~\nMore text.'), 'Real text here.\nMore text.');
});
test('cleanOcrText squeezes runs of spaces and removes soft hyphens', () => {
  assert.equal(O.cleanOcrText('a   b\u00adc'), 'a bc');
});
test('cleanOcrText of empty input is empty', () => {
  assert.equal(O.cleanOcrText(''), '');
  assert.equal(O.cleanOcrText(null), '');
});
test('isNoiseLine identifies short symbol lines only', () => {
  assert.equal(O.isNoiseLine('--'), true);
  assert.equal(O.isNoiseLine('1.'), false);
  assert.equal(O.isNoiseLine('ok'), false);
  assert.equal(O.isNoiseLine(''), false);
});
test('extractEntities finds emails and urls', () => {
  const e = O.extractEntities('Mail accounts@example.com or visit https://example.com/pay.');
  assert.deepEqual(e.emails, ['accounts@example.com']);
  assert.deepEqual(e.urls, ['https://example.com/pay']);
});
test('extractEntities finds dates in several formats', () => {
  const e = O.extractEntities('Issued 04/11/2026 and due 2026-11-30, reviewed 4.11.26');
  assert.deepEqual(e.dates, ['04/11/2026', '2026-11-30', '4.11.26']);
});
test('extractEntities finds currency amounts and totals', () => {
  const e = O.extractEntities('Subtotal Rs 1,000.00\nGrand Total: ₹1,250.00\nTax 5.00');
  assert.ok(e.amounts.includes('Rs 1,000.00'));
  assert.ok(e.amounts.includes('₹1,250.00'));
  assert.equal(e.totals.length, 1);
  assert.match(e.totals[0], /Grand Total/);
});
test('extractEntities finds phone numbers and ignores short digit runs', () => {
  const e = O.extractEntities('Call +91 95395 34851 or 1234 5678 today. Ref 4821.');
  assert.ok(e.phones.some((p) => p.replace(/\D/g, '').endsWith('9539534851')));
  assert.ok(!e.phones.includes('4821'));
});
test('extractEntities returns empty lists for plain text', () => {
  const e = O.extractEntities('Nothing to see here');
  assert.deepEqual(e.emails, []);
  assert.deepEqual(e.totals, []);
});
test('structureText recognises an all-caps heading and a paragraph', () => {
  const b = O.structureText('INVOICE\nThanks for your order and payment.');
  assert.equal(b[0].type, 'heading');
  assert.equal(b[0].text, 'INVOICE');
  assert.equal(b[1].type, 'paragraph');
});
test('structureText groups bullets into one list', () => {
  const b = O.structureText('- apples\n- pears\n2. plums');
  assert.equal(b.length, 1);
  assert.equal(b[0].type, 'list');
  assert.deepEqual(b[0].items, ['apples', 'pears', 'plums']);
});
test('structureText splits paragraphs on blank lines', () => {
  const b = O.structureText('One sentence here.\n\nAnother sentence here.');
  assert.equal(b.filter((x) => x.type === 'paragraph').length, 2);
});
test('structureText of empty text is empty', () => {
  assert.deepEqual(O.structureText(''), []);
});
test('computeStats counts words, characters and lines', () => {
  const s = O.computeStats('one two\nthree', 92.4);
  assert.equal(s.words, 3);
  assert.equal(s.lines, 2);
  assert.equal(s.confidence, 92);
  assert.equal(s.lowConfidence, false);
});
test('computeStats flags low confidence and handles a missing score', () => {
  assert.equal(O.computeStats('x', 40).lowConfidence, true);
  assert.equal(O.computeStats('x', null).confidence, null);
  assert.equal(O.computeStats('', null).lines, 0);
});
test('buildCleanupPrompt asks to keep numbers and includes the text', () => {
  const msgs = O.buildCleanupPrompt('Total 1,250.00');
  assert.match(msgs[0].content, /Keep every number/);
  assert.equal(msgs[1].content, 'Total 1,250.00');
});
test('buildCleanupPrompt refuses empty text', () => {
  assert.throws(() => O.buildCleanupPrompt('   '), /no text to clean up/);
});
test('renderTextHtml escapes markup from the image', () => {
  const html = O.renderTextHtml([{ type: 'paragraph', text: '<script>x</script>' }]);
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
});
test('renderTextHtml says so when there is nothing', () => {
  assert.match(O.renderTextHtml([]), /No text found/);
});
