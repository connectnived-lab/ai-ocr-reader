// Browser OCR using the vendored tesseract.js build (no CDN). Loaded from vendor/tesseract.
const VENDOR = 'vendor/tesseract/';
let workerPromise = null;

export function ocrAvailable() {
  return typeof window !== 'undefined' && typeof window.Tesseract !== 'undefined';
}

export function getWorker(onProgress = () => {}) {
  if (!ocrAvailable()) return Promise.reject(new Error('The OCR engine did not load. Reload the page.'));
  if (!workerPromise) {
    workerPromise = window.Tesseract.createWorker('eng', 1, {
      workerPath: VENDOR + 'worker.min.js',
      corePath: VENDOR + 'tesseract-core-simd-lstm.wasm.js',
      langPath: VENDOR + 'lang',
      gzip: true,
      cacheMethod: 'none',
      logger: (m) => onProgress(m),
    }).catch((err) => {
      workerPromise = null;
      throw err;
    });
  }
  return workerPromise;
}

export async function readImage(file, onProgress) {
  const worker = await getWorker(onProgress);
  const result = await worker.recognize(file);
  const data = result && result.data ? result.data : {};
  return { text: data.text || '', confidence: typeof data.confidence === 'number' ? data.confidence : null };
}
