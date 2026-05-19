import { useState, useRef, useCallback } from 'react';
import { PDFDocument, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  ArrowLeft,
  RotateCw,
  RotateCcw,
  Loader2,
  Download,
  Package,
  X,
  Scissors,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { downloadPdf } from '@/lib/download';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).href;

/* ── types ────────────────────────────────────────────────────── */
interface PdfPage {
  id: string;
  pageNumber: number;
  name: string;
  rotation: number; // 0 | 90 | 180 | 270
  thumbnail?: string;
  file: File;
  selected?: boolean;
}

/* ── helpers ──────────────────────────────────────────────────── */
function rotationLabel(deg: number) {
  switch (deg) {
    case 0: return '0°';
    case 90: return '90°';
    case 180: return '180°';
    case 270: return '270°';
    default: return `${deg}°`;
  }
}

/** Extract a single page from a PDF with rotation applied */
async function extractPage(
  file: File,
  pageIndex: number,
  rotation: number
): Promise<Uint8Array> {
  const buf = await file.arrayBuffer();
  const src = await PDFDocument.load(buf);
  const newDoc = await PDFDocument.create();

  const [copiedPage] = await newDoc.copyPages(src, [pageIndex]);
  if (rotation !== 0) {
    copiedPage.setRotation(degrees(rotation));
  }
  newDoc.addPage(copiedPage);

  const bytes = await newDoc.save();
  return bytes;
}

/** Generate thumbnail for a specific page using pdf.js */
async function generatePageThumbnail(file: File, pageNumber: number): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(pageNumber);

  const scale = 0.6;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({ canvas, canvasContext: ctx, viewport }).promise;
  const dataUrl = canvas.toDataURL('image/jpeg', 0.82);

  page.cleanup?.();
  loadingTask.destroy?.();
  return dataUrl;
}

/* ── Split Page ───────────────────────────────────────────────── */
export default function SplitPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PdfPage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── drag & drop ────────────────────────────────────────────── */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files).find(
      (f) => f.type === 'application/pdf'
    );
    if (dropped) {
      void loadPdf(dropped);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    void loadPdf(e.target.files[0]);
    e.target.value = '';
  }, []);

  /* ── load PDF and generate thumbnails ───────────────────────── */
  const loadPdf = async (pdfFile: File) => {
    setIsLoading(true);
    setFile(pdfFile);
    setPages([]);

    try {
      const buf = await pdfFile.arrayBuffer();
      const pdf = await PDFDocument.load(buf, { updateMetadata: false });
      const pageCount = pdf.getPageCount();

      const newPages: PdfPage[] = Array.from({ length: pageCount }, (_, i) => ({
        id: Math.random().toString(36).substring(2, 11),
        pageNumber: i + 1,
        name: `${pdfFile.name.replace(/\.pdf$/i, '')}_pagina_${i + 1}`,
        rotation: 0,
        selected: false,
        file: pdfFile,
      }));

      setPages(newPages);

      // Generate thumbnails in parallel
      await Promise.all(
        newPages.map(async (page) => {
          try {
            const thumbnail = await generatePageThumbnail(pdfFile, page.pageNumber);
            setPages((prev) =>
              prev.map((p) =>
                p.id === page.id ? { ...p, thumbnail } : p
              )
            );
          } catch {
            // silently fail for this thumbnail
          }
        })
      );
    } catch (err) {
      console.error(err);
      alert('Erro ao carregar PDF. Verifique se o arquivo não está corrompido.');
      setFile(null);
    } finally {
      setIsLoading(false);
    }
  };

  /* ── page actions ───────────────────────────────────────────── */
  const rotatePage = (id: string, direction: 'cw' | 'ccw') => {
    setPages((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const rot = direction === 'cw' ? (p.rotation + 90) % 360 : (p.rotation - 90 + 360) % 360;
        return { ...p, rotation: rot };
      })
    );
  };

  const setRotation = (id: string, rotation: number) => {
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, rotation } : p)));
  };

  const updateName = (id: string, name: string) => {
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
  };

  const removeFile = () => {
    setFile(null);
    setPages([]);
  };

  /* ── download single page ───────────────────────────────────── */
  const downloadPage = async (page: PdfPage) => {
    setIsProcessing(true);
    try {
      const bytes = await extractPage(page.file, page.pageNumber - 1, page.rotation);
      const cleanName = page.name.replace(/\.pdf$/i, '');
      await downloadPdf(bytes, `${cleanName}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Erro ao extrair página. Verifique se o arquivo não está corrompido.');
    } finally {
      setIsProcessing(false);
    }
  };

  /* ── download all pages ─────────────────────────────────────── */
  const downloadAll = async () => {
    if (pages.length === 0) return;
    setIsProcessing(true);
    try {
      for (const page of pages) {
        const bytes = await extractPage(page.file, page.pageNumber - 1, page.rotation);
        const cleanName = page.name.replace(/\.pdf$/i, '');
        await downloadPdf(bytes, `${cleanName}.pdf`);
        // Small delay to prevent browser from blocking multiple downloads
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao extrair páginas.');
    } finally {
      setIsProcessing(false);
    }
  };

  /* ── download selected pages as single PDF ───────────────────── */
  const downloadSelected = async () => {
    const selectedPages = pages.filter((p) => p.selected);
    if (selectedPages.length === 0) return;
    setIsProcessing(true);
    try {
      const merged = await PDFDocument.create();
      for (const page of selectedPages) {
        const bytes = await extractPage(page.file, page.pageNumber - 1, page.rotation);
        const src = await PDFDocument.load(bytes);
        const [copied] = await merged.copyPages(src, [0]);
        merged.addPage(copied);
      }
      const out = await merged.save();
      await downloadPdf(out, `selected_${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Erro ao baixar páginas selecionadas.');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleSelect = (id: string) => {
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, selected: !p.selected } : p)));
  };

  /* ── render ──────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Header */}
      <header className="border-b border-zinc-800 sticky top-0 z-10 backdrop-blur">
        <div className="relative h-14 px-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-indigo-400 gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-xs">Voltar</span>
          </Button>

          <div className="max-w-6xl mx-auto h-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-amber-600 p-1.5 rounded-lg">
                <Scissors className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-lg font-semibold tracking-tight">Separar PDF</h1>
            </div>
            <div className="flex items-center gap-2">
              {pages.length > 0 && (
                <>
                  <span className="text-sm text-zinc-400">{pages.length} página(s)</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={removeFile}
                    className="text-slate-500 hover:text-red-600"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Upload zone - shown when no file */}
        {!file && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200',
              isDragging
                ? 'border-amber-500 bg-amber-500/10 scale-[1.02]'
                : 'border-zinc-700 bg-zinc-900 hover:border-zinc-600 hover:bg-zinc-800/60'
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-3">
              <div
                className={cn(
                  'p-3 rounded-full transition-colors',
                  isDragging ? 'bg-amber-500/20' : 'bg-zinc-800'
                )}
              >
                <Upload
                  className={cn(
                    'w-8 h-8 transition-colors',
                    isDragging ? 'text-amber-300' : 'text-zinc-400'
                  )}
                />
              </div>
              <div>
                <p className="text-base font-medium text-zinc-200">
                  {isDragging ? 'Solte o PDF aqui' : 'Arraste um PDF ou clique para escolher'}
                </p>
                <p className="text-sm text-zinc-500 mt-1">Selecione um arquivo PDF para separar as páginas</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
            <Loader2 className="w-10 h-10 animate-spin mb-4 text-amber-500" />
            <p className="text-sm">Carregando páginas...</p>
          </div>
        )}

        {/* Pages grid */}
        {file && pages.length > 0 && !isLoading && (
          <>
            {/* Controls bar */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">
                Páginas
              </h2>
              <div className="flex items-center gap-2">
                {pages.some((p) => p.selected) && (
                  <Button
                    onClick={downloadSelected}
                    disabled={isProcessing}
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-md"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    <span className="text-sm">Baixar selecionadas</span>
                  </Button>
                )}
                <Button
                  onClick={downloadAll}
                  disabled={isProcessing}
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white gap-2 shadow-md"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Package className="w-4 h-4" />
                  )}
                  <span className="text-sm">Baixar Todas</span>
                </Button>
              </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {pages.map((page) => (
                <Card
                  key={page.id}
                  onClick={() => toggleSelect(page.id)}
                  className={cn(
                    'bg-zinc-900/60 border-zinc-800 overflow-hidden hover:border-zinc-700 transition-all cursor-pointer',
                    page.selected ? 'ring-4 ring-blue-500' : ''
                  )}
                >
                  <CardContent className="p-3 space-y-3">
                    {/* Thumbnail */}
                    <div className="relative">
                      <div
                        className={cn(
                          'aspect-[3/4] rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden flex items-center justify-center transition-transform duration-300',
                          page.rotation === 90 && 'rotate-90',
                          page.rotation === 180 && 'rotate-180',
                          page.rotation === 270 && '-rotate-90'
                        )}
                      >
                        {page.thumbnail ? (
                          <img
                            src={page.thumbnail}
                            alt={`Página ${page.pageNumber}`}
                            className="w-full h-full object-contain"
                            draggable={false}
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-zinc-500">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="text-[10px]">Carregando…</span>
                          </div>
                        )}
                      </div>
                      {/* Rotation badge */}
                      {page.rotation !== 0 && (
                        <div className="absolute -bottom-1.5 -right-1.5 bg-amber-600 text-white text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-sm">
                          {rotationLabel(page.rotation)}
                        </div>
                      )}
                      {/* Page number badge */}
                      <div className="absolute top-1.5 left-1.5 bg-zinc-800/90 text-zinc-300 text-[10px] font-bold px-1.5 py-0.5 rounded">
                        {page.pageNumber}
                      </div>
                      {/* selection is handled by card click; visual change is applied on Card */}
                    </div>

                    {/* Filename input */}
                    <div>
                      <Input
                        value={page.name}
                        onChange={(e) => updateName(page.id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-7 text-xs bg-zinc-800 border-zinc-700 text-zinc-200 focus:border-amber-500 focus:ring-amber-500/20"
                        placeholder="nome_do_arquivo"
                      />
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-between">
                      {/* Rotation presets */}
                      <div className="flex items-center bg-zinc-800 rounded-md p-0.5 border border-zinc-700">
                        {[0, 90, 180, 270].map((deg) => (
                          <button
                            key={deg}
                            onClick={(e) => { e.stopPropagation(); setRotation(page.id, deg); }}
                            className={cn(
                              'px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors',
                              page.rotation === deg
                                ? 'bg-zinc-950 text-amber-300 shadow-sm'
                                : 'text-zinc-400 hover:text-zinc-200'
                            )}
                          >
                            {rotationLabel(deg)}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); rotatePage(page.id, 'ccw'); }}
                          className="text-zinc-500 hover:text-amber-400 h-7 w-7 p-0"
                          title="Girar 90° anti-horário"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); rotatePage(page.id, 'cw'); }}
                          className="text-zinc-500 hover:text-amber-400 h-7 w-7 p-0"
                          title="Girar 90° horário"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Download button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadPage(page)}
                      disabled={isProcessing}
                      className="w-full text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 border border-zinc-800 hover:border-emerald-500/30 h-8 text-xs gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Baixar
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
