# AI OCR Reader

**One-line pitch:** Read text from screenshots, scans and photos, in your browser.

## Description (about 120 words)
Choose an image and the app reads its text in the browser using a vendored Tesseract build (no CDN, no upload anywhere). It then tidies line breaks, rebuilds paragraphs and pulls out emails, phone numbers, links, dates, amounts and totals. A confidence score flags weak reads. Live mode can ask your own OpenAI-compatible model to clean the text further.

## Tech used
- Plain HTML, CSS and ES modules
- tesseract.js 7 (vendored, English model) run in a web worker
- Node test runner and Playwright (Python) end-to-end smoke

## What you can demo in 30 seconds
1. Upload a screenshot or photo of a receipt or invoice. 2. Watch the text appear. 3. See the emails, amounts and totals pulled out below it.

## Resume bullets
- Built an in-browser OCR reader with a vendored Tesseract engine, text cleanup and entity extraction that works fully offline.
- Wrote 65 unit tests for cleanup, entity extraction, structuring and prompt building, plus a Playwright smoke test on mobile and desktop widths.
- Added an optional live mode that sends only the recognised text to a user-supplied model endpoint.

## LinkedIn post draft
Built an AI OCR reader that runs in the browser: upload a screenshot, scan or photo, get the text back, cleaned up, with emails, amounts and totals pulled out. No upload to a server, works offline. 65 unit tests and a Playwright smoke test. Repo link in the comments.
