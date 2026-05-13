/* ── Lazy-loaded thumbnail generator using pdf.js ─────────────── */
export async function generateThumbnail(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');

  const workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).href;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);

  const scale = 0.6;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({ canvas, canvasContext: ctx, viewport }).promise;
  const dataUrl = canvas.toDataURL('image/jpeg', 0.82);

  page.cleanup?.();
  pdf.destroy();
  return dataUrl;
}
