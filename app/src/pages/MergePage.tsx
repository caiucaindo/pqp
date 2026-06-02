import { useState, useRef, useCallback, useEffect } from 'react';
import { PDFDocument, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { generateThumbnail } from '@/utils/thumbnail';
import {
  Upload,
  FileText,
  RotateCw,
  RotateCcw,
  Trash2,
  ArrowUp,
  ArrowDown,
  Merge,
  GripVertical,
  X,
  FilePlus,
  Loader2,
  Settings2,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { downloadPdf } from '@/lib/download';
import { PageHeader, pageContentLayout } from '@/components/PageHeader';
import { dragHasFiles, dragLooksLikePdf, isPdfFile } from '@/lib/fileTypes';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).href;

/* ── types ────────────────────────────────────────────────────── */
interface PdfFile {
  id: string;
  file: File;
  name: string;
  size: string;
  rotation: number; // 0 | 90 | 180 | 270
  pageCount?: number;
  thumbnail?: string;
  pageWidth?: number;
  pageHeight?: number;
  order: number;
}

interface PreviewState {
  file: PdfFile;
  pageNumber: number;
  image?: string;
  loading: boolean;
}

/* ── helpers ──────────────────────────────────────────────────── */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/** Load a PDF and rotate every page by the given degrees.
 *  Returns a *new* PDFDocument so the original stays untouched. */
async function prepareRotatedPdf(file: File, rotation: number): Promise<PDFDocument> {
  const buf = await file.arrayBuffer();
  const src = await PDFDocument.load(buf);
  if (rotation === 0) return src;
  for (const page of src.getPages()) {
    page.setRotation(degrees(rotation));
  }
  return src;
}

async function generatePdfPageImage(file: File, pageNumber: number, scale = 1.35): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({ canvas, canvasContext: ctx, viewport }).promise;
  const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

  page.cleanup?.();
  loadingTask.destroy?.();
  return dataUrl;
}

/* ── A4 dimensions in PDF points ─────────────────────────────── */
const A4_W = 595.28;
const A4_H = 841.89;

/* ── App ───────────────────────────────────────────────────────── */
export default function MergePage() {
  const [files, setFiles] = useState<PdfFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isInvalidDrag, setIsInvalidDrag] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [fileDropIndex, setFileDropIndex] = useState<number | null>(null);
  const [standardizeSize, setStandardizeSize] = useState(false);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastFileDragAtRef = useRef(0);
  const contentLayout = pageContentLayout('standard');

  /* ── drag & drop (global upload zone) ───────────────────────── */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!dragHasFiles(e)) return;
    e.preventDefault();
    e.stopPropagation();
    lastFileDragAtRef.current = Date.now();
    setIsInvalidDrag(!dragLooksLikePdf(e));
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!dragHasFiles(e)) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragging(false);
      setIsInvalidDrag(false);
      setFileDropIndex(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, insertIndex?: number) => {
    if (!dragHasFiles(e)) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setIsInvalidDrag(false);
    setFileDropIndex(null);
    const dropped = Array.from(e.dataTransfer.files).filter(
      isPdfFile
    );
    if (dropped.length === 0) {
      alert('Arquivo não aceito. Use apenas PDFs.');
      return;
    }
    addFiles(dropped, insertIndex);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files).filter(isPdfFile);
    if (selected.length === 0) {
      alert('Arquivo não aceito. Use apenas PDFs.');
      e.target.value = '';
      return;
    }
    addFiles(selected);
    e.target.value = '';
  }, []);

  useEffect(() => {
    const clearExternalDrag = () => {
      setIsDragging(false);
      setIsInvalidDrag(false);
      setFileDropIndex(null);
      lastFileDragAtRef.current = 0;
    };
    const clearWhenLeavingWindow = (event: DragEvent) => {
      if (event.clientX <= 0 || event.clientY <= 0 || event.clientX >= window.innerWidth || event.clientY >= window.innerHeight) {
        clearExternalDrag();
      }
    };
    const staleDragTimer = window.setInterval(() => {
      if (lastFileDragAtRef.current > 0 && Date.now() - lastFileDragAtRef.current > 450) {
        clearExternalDrag();
        lastFileDragAtRef.current = 0;
      }
    }, 180);

    window.addEventListener('drop', clearExternalDrag);
    window.addEventListener('dragend', clearExternalDrag);
    window.addEventListener('blur', clearExternalDrag);
    window.addEventListener('mouseleave', clearExternalDrag);
    document.addEventListener('dragleave', clearWhenLeavingWindow);
    document.addEventListener('visibilitychange', clearExternalDrag);
    return () => {
      window.removeEventListener('drop', clearExternalDrag);
      window.removeEventListener('dragend', clearExternalDrag);
      window.removeEventListener('blur', clearExternalDrag);
      window.removeEventListener('mouseleave', clearExternalDrag);
      document.removeEventListener('dragleave', clearWhenLeavingWindow);
      document.removeEventListener('visibilitychange', clearExternalDrag);
      window.clearInterval(staleDragTimer);
    };
  }, []);

  /* ── add files (parse pages + thumbnail) ────────────────────── */
  const addFiles = async (newFiles: File[], insertIndex?: number) => {
    const tmpFiles: PdfFile[] = newFiles.map((file, i) => ({
      id: Math.random().toString(36).substring(2, 11),
      file,
      name: file.name,
      size: formatBytes(file.size),
      rotation: 0,
      order: i,
    }));

    setFiles((prev) => {
      const targetIndex = insertIndex === undefined
        ? prev.length
        : Math.max(0, Math.min(insertIndex, prev.length));
      const next = [...prev];
      next.splice(targetIndex, 0, ...tmpFiles);
      return next.map((file, index) => ({ ...file, order: index }));
    });

    await Promise.all(
      tmpFiles.map(async (pdfFile) => {
        try {
          const buf = await pdfFile.file.arrayBuffer();
          const pdf = await PDFDocument.load(buf);
          const pageCount = pdf.getPageCount();
          const firstPage = pdf.getPage(0);
          const { width: pageWidth, height: pageHeight } = firstPage.getSize();
          let thumbnail: string | undefined;
          try {
            thumbnail = await generateThumbnail(pdfFile.file);
          } catch {
            thumbnail = undefined;
          }
          setFiles((prev) =>
            prev.map((f) =>
              f.id === pdfFile.id ? { ...f, pageCount, pageWidth, pageHeight, thumbnail } : f
            )
          );
        } catch {
          // silent fail
        }
      })
    );
  };

  /* ── file actions ────────────────────────────────────────────── */
  const removeFile = (id: string) => {
    setFiles((prev) =>
      prev.filter((f) => f.id !== id).map((f, i) => ({ ...f, order: i }))
    );
  };

  const rotateFile = (id: string, direction: 'cw' | 'ccw') => {
    setFiles((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        const rot = direction === 'cw' ? (f.rotation + 90) % 360 : (f.rotation - 90 + 360) % 360;
        return { ...f, rotation: rot };
      })
    );
  };

  const setRotation = (id: string, rotation: number) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, rotation } : f)));
  };

  const suggestA4Rotation = (pdfFile: PdfFile) => {
    if (!pdfFile.pageWidth || !pdfFile.pageHeight) return pdfFile.rotation;
    const originalLandscape = pdfFile.pageWidth > pdfFile.pageHeight;
    const normalized = ((pdfFile.rotation % 360) + 360) % 360;
    const sidewayRotation = normalized === 90 || normalized === 270;

    if (originalLandscape && !sidewayRotation) return 90;
    if (!originalLandscape && sidewayRotation) return 0;
    return normalized;
  };

  const handleStandardizeChange = (checked: boolean) => {
    setStandardizeSize(checked);
    if (!checked) return;
    setFiles((prev) =>
      prev.map((pdfFile) => ({
        ...pdfFile,
        rotation: suggestA4Rotation(pdfFile),
      }))
    );
  };

  const moveFile = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === files.length - 1) return;
    const next = [...files];
    const target = direction === 'up' ? index - 1 : index + 1;
    [next[index], next[target]] = [next[target], next[index]];
    setFiles(next.map((f, i) => ({ ...f, order: i })));
  };

  /* ── drag reordering ────────────────────────────────────────── */
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.stopPropagation();
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOverItem = (e: React.DragEvent, index: number) => {
    if (dragHasFiles(e)) {
      e.preventDefault();
      e.stopPropagation();
      lastFileDragAtRef.current = Date.now();
      setIsInvalidDrag(!dragLooksLikePdf(e));
      setIsDragging(true);
      const rect = e.currentTarget.getBoundingClientRect();
      const insertIndex = e.clientY > rect.top + rect.height / 2 ? index + 1 : index;
      setFileDropIndex(insertIndex);
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(index);
  };

  const handleDropItem = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragHasFiles(e)) {
      const rect = e.currentTarget.getBoundingClientRect();
      const insertIndex = e.clientY > rect.top + rect.height / 2 ? dropIndex + 1 : dropIndex;
      handleDrop(e, insertIndex);
      return;
    }

    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
    if (dragIndex === dropIndex || isNaN(dragIndex)) {
      setDragOverIndex(null);
      return;
    }
    const next = [...files];
    const [removed] = next.splice(dragIndex, 1);
    next.splice(dropIndex, 0, removed);
    setFiles(next.map((f, i) => ({ ...f, order: i })));
    setDragOverIndex(null);
    setFileDropIndex(null);
  };

  const handleFileListDragOver = (e: React.DragEvent) => {
    if (!dragHasFiles(e)) return;
    e.preventDefault();
    e.stopPropagation();
    lastFileDragAtRef.current = Date.now();
    setIsInvalidDrag(!dragLooksLikePdf(e));
    setIsDragging(true);
    setFileDropIndex(files.length);
  };

  const clearAll = () => setFiles([]);

  const openPreview = async (pdfFile: PdfFile, pageNumber = 1) => {
    setPreview((current) => ({
      file: pdfFile,
      pageNumber,
      image: current?.file.id === pdfFile.id ? current.image : undefined,
      loading: true,
    }));
    try {
      const image = await generatePdfPageImage(pdfFile.file, pageNumber);
      setPreview((current) =>
        current?.file.id === pdfFile.id && current.pageNumber === pageNumber
          ? { ...current, image, loading: false }
          : current
      );
    } catch (err) {
      console.error(err);
      setPreview((current) =>
        current?.file.id === pdfFile.id && current.pageNumber === pageNumber
          ? { ...current, loading: false }
          : current
      );
      alert('Erro ao carregar visualização do PDF.');
    }
  };

  const goToPreviewPage = (direction: 'prev' | 'next') => {
    if (!preview) return;
    const pageCount = preview.file.pageCount ?? 1;
    const nextPage = direction === 'prev'
      ? Math.max(1, preview.pageNumber - 1)
      : Math.min(pageCount, preview.pageNumber + 1);
    if (nextPage === preview.pageNumber) return;
    void openPreview(preview.file, nextPage);
  };

  /* ── download single (rotated) PDF ──────────────────────────── */
  const downloadSingle = async (pdfFile: PdfFile) => {
    setIsProcessing(true);
    try {
      const rotated = await prepareRotatedPdf(pdfFile.file, pdfFile.rotation);
      const bytes = await rotated.save();
      const cleanName = pdfFile.name.replace(/\.pdf$/i, '');
      await downloadPdf(bytes, `${cleanName}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Erro ao processar PDF. Verifique se o arquivo não está corrompido.');
    } finally {
      setIsProcessing(false);
    }
  };

  /* ── merge ───────────────────────────────────────────────────── */
  const mergePdfs = async () => {
    if (files.length < 1) return; // allow single rotated download via merge button too
    setIsProcessing(true);
    try {
      const merged = await PDFDocument.create();

      for (const pdfFile of files) {
        const src = await prepareRotatedPdf(pdfFile.file, pdfFile.rotation);

        if (standardizeSize) {
          const embeddedPages = await merged.embedPdf(src, src.getPageIndices());
          for (const embeddedPage of embeddedPages) {
            const { width: ew, height: eh } = embeddedPage.size();

            // Choose A4 orientation based on embedded page shape
            const isLandscape = ew > eh;
            const pageW = isLandscape ? A4_H : A4_W;
            const pageH = isLandscape ? A4_W : A4_H;

            // Fit inside page (never upscale beyond 1)
            const scale = Math.min(pageW / ew, pageH / eh, 1);
            const drawW = ew * scale;
            const drawH = eh * scale;

            const newPage = merged.addPage([pageW, pageH]);
            newPage.drawPage(embeddedPage, {
              x: (pageW - drawW) / 2,
              y: (pageH - drawH) / 2,
              width: drawW,
              height: drawH,
            });
          }
        } else {
          const pages = await merged.copyPages(src, src.getPageIndices());
          for (const page of pages) {
            merged.addPage(page);
          }
        }
      }

      const bytes = await merged.save();
      const filename = files.length === 1
        ? files[0].name.replace(/\.pdf$/i, '') + '.pdf'
        : `merged_${new Date().toISOString().slice(0, 10)}.pdf`;
      await downloadPdf(bytes, filename);
    } catch (err) {
      console.error(err);
      alert('Erro ao mesclar PDFs. Verifique se os arquivos não estão corrompidos.');
    } finally {
      setIsProcessing(false);
    }
  };

  /* ── ui helpers ──────────────────────────────────────────────── */
  const rotationLabel = (deg: number) => {
    switch (deg) {
      case 0: return '0°';
      case 90: return '90°';
      case 180: return '180°';
      case 270: return '270°';
      default: return `${deg}°`;
    }
  };

  const rotationTransform = (rotation: number, scaleWhenSideways = 0.74) => {
    const normalized = ((rotation % 360) + 360) % 360;
    if (normalized === 0) return undefined;
    const scale = normalized === 90 || normalized === 270 ? ` scale(${scaleWhenSideways})` : '';
    return `rotate(${normalized}deg)${scale}`;
  };

  const getThumbLayout = (pdfFile: PdfFile) => {
    const rotation = ((pdfFile.rotation % 360) + 360) % 360;
    const originalLandscape = (pdfFile.pageWidth ?? 0) > (pdfFile.pageHeight ?? 0);
    const sourceBase = originalLandscape
      ? { width: 160, height: 120 }
      : { width: 120, height: 160 };
    const sideways = rotation === 90 || rotation === 270;
    const visualLandscape = sideways ? !originalLandscape : originalLandscape;
    const scale = visualLandscape ? 0.94 : 1;
    const source = {
      width: sourceBase.width * scale,
      height: sourceBase.height * scale,
    };
    const frame = sideways
      ? { width: source.height, height: source.width }
      : source;

    return {
      frame,
      source,
      transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
    };
  };

  /* ── render ──────────────────────────────────────────────────── */
  return (
    <div
      className="min-h-screen bg-background text-foreground font-sans"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <PageHeader
        title="Mesclar PDF"
        icon={<FileText className="w-5 h-5 text-white" />}
        iconClassName="bg-indigo-600"
        contentClassName={contentLayout.className}
        contentStyle={contentLayout.style}
        actions={files.length > 0 && (
          <>
            <span className="text-sm text-zinc-400">{files.length} arquivo(s)</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="text-slate-500 hover:text-red-600"
            >
              <X className="w-4 h-4" />
            </Button>
          </>
        )}
      />

      <main className={cn(contentLayout.className, 'py-8')} style={contentLayout.style}>
        {/* Upload zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200',
            isDragging && isInvalidDrag
              ? 'border-red-500 bg-red-500/10 scale-[1.02]'
              : isDragging
              ? 'border-indigo-500 bg-indigo-500/10 scale-[1.02]'
              : 'border-zinc-700 bg-zinc-900 hover:border-zinc-600 hover:bg-zinc-800/60'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-3">
            <div
              className={cn(
                'p-3 rounded-full transition-colors',
                isDragging && isInvalidDrag ? 'bg-red-500/20' : isDragging ? 'bg-indigo-500/20' : 'bg-zinc-800'
              )}
            >
              <Upload
                className={cn(
                  'w-8 h-8 transition-colors',
                  isDragging && isInvalidDrag ? 'text-red-300' : isDragging ? 'text-indigo-300' : 'text-zinc-400'
                )}
              />
            </div>
            <div>
              <p className="text-base font-medium text-zinc-200">
                {isDragging && isInvalidDrag ? 'Isso não é um PDF' : isDragging ? 'Basta Soltar' : 'Arraste PDFs ou clique para escolher'}
              </p>
              <p className="text-sm text-zinc-500 mt-1">Aceita múltiplos PDFs</p>
            </div>
          </div>
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div
            className="mt-8 space-y-3"
            onDragOver={handleFileListDragOver}
            onDrop={(e) => handleDrop(e, fileDropIndex ?? files.length)}
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">
                Arquivos
              </h2>
              <p className="text-xs text-zinc-500">Arraste para reordenar</p>
            </div>

            {files.map((pdfFile, index) => (
              <div key={pdfFile.id} className="space-y-2">
              {isDragging && !isInvalidDrag && fileDropIndex === index && (
                <div className="h-1 rounded-full bg-indigo-500/70 shadow-sm shadow-indigo-900/40" />
              )}
              <Card
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOverItem(e, index)}
                onDrop={(e) => handleDropItem(e, index)}
                onDragEnd={() => {
                  setDragOverIndex(null);
                  setFileDropIndex(null);
                  setIsDragging(false);
                  setIsInvalidDrag(false);
                }}
                className={cn(
                  'group cursor-move transition-all duration-150 border-l-4',
                  dragOverIndex === index
                    ? 'border-l-indigo-500 shadow-md scale-[1.01]'
                    : 'border-l-transparent',
                  isDragging && !isInvalidDrag && fileDropIndex !== null && 'ring-1 ring-indigo-500/10',
                  'hover:shadow-sm'
                )}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  {/* Drag handle */}
                  <div className="text-zinc-600 hover:text-zinc-400">
                    <GripVertical className="w-4 h-4" />
                  </div>

                  {/* Thumbnail */}
                  <div className="w-40 h-40 shrink-0 relative flex items-center justify-center">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); void openPreview(pdfFile); }}
                      className="rounded-md bg-transparent p-0 overflow-visible flex items-center justify-center"
                      aria-label="Visualizar PDF"
                    >
                      {pdfFile.thumbnail ? (
                        (() => {
                          const thumbLayout = getThumbLayout(pdfFile);
                          return (
                            <span
                              className="relative block rounded-md transition-transform duration-200 hover:scale-[1.03] hover:ring-1 hover:ring-indigo-400/50"
                              style={{
                                width: thumbLayout.frame.width,
                                height: thumbLayout.frame.height,
                              }}
                            >
                              <span
                                className="absolute left-1/2 top-1/2 block overflow-hidden rounded bg-white shadow-md shadow-zinc-950/30"
                                style={{
                                  width: thumbLayout.source.width,
                                  height: thumbLayout.source.height,
                                  transform: thumbLayout.transform,
                                }}
                              >
                                <img
                                  src={pdfFile.thumbnail}
                                  alt=""
                                  className="h-full w-full object-cover"
                                  draggable={false}
                                />
                              </span>
                            </span>
                          );
                        })()
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-zinc-500">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span className="text-[10px]">Carregando…</span>
                        </div>
                      )}
                    </button>
                    {/* Rotation badge */}
                    <div className="absolute -bottom-1.5 -right-1.5 bg-indigo-600 text-white text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-sm">
                      {rotationLabel(pdfFile.rotation)}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">{pdfFile.name}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {pdfFile.size}
                      {pdfFile.pageCount ? ` • ${pdfFile.pageCount} pág.` : ''}
                    </p>
                  </div>

                  {/* Rotation controls */}
                  <div className="flex items-center gap-1">
                    <div className="flex items-center bg-zinc-800 rounded-lg p-0.5 border border-zinc-700">
                      {[0, 90, 180, 270].map((deg) => (
                        <button
                          key={deg}
                          onClick={() => setRotation(pdfFile.id, deg)}
                          className={cn(
                            'px-2 py-1 text-xs font-medium rounded-md transition-colors',
                            pdfFile.rotation === deg
                              ? 'bg-zinc-950 text-indigo-300 shadow-sm'
                              : 'text-zinc-400 hover:text-zinc-200'
                          )}
                        >
                          {rotationLabel(deg)}
                        </button>
                      ))}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => rotateFile(pdfFile.id, 'ccw')}
                      className="text-zinc-500 hover:text-indigo-400"
                      title="Girar 90° anti-horário"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => rotateFile(pdfFile.id, 'cw')}
                      className="text-zinc-500 hover:text-indigo-400"
                      title="Girar 90° horário"
                    >
                      <RotateCw className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Reorder arrows */}
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => moveFile(index, 'up')}
                      disabled={index === 0}
                      className="text-zinc-600 hover:text-zinc-400 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveFile(index, 'down')}
                      disabled={index === files.length - 1}
                      className="text-zinc-600 hover:text-zinc-400 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Download single */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => downloadSingle(pdfFile)}
                    className="text-zinc-600 hover:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Baixar PDF rotacionado"
                  >
                    <Download className="w-4 h-4" />
                  </Button>

                  {/* Preview */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void openPreview(pdfFile)}
                    className="text-zinc-600 hover:text-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Visualizar PDF"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>

                  {/* Remove */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(pdfFile.id)}
                    className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
              {isDragging && !isInvalidDrag && fileDropIndex === index + 1 && index === files.length - 1 && (
                <div className="h-1 rounded-full bg-indigo-500/70 shadow-sm shadow-indigo-900/40" />
              )}
              </div>
            ))}

            {/* Merge controls */}
            {files.length >= 1 && (
              <div className="pt-4 flex flex-col items-center gap-4">
                {/* Standardize toggle */}
                <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 shadow-sm">
                  <div className="p-2 bg-indigo-50 rounded-lg">
                    <Settings2 className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-zinc-200">Padronizar em A4</p>
                    <p className="text-xs text-zinc-500">
                      Todas as páginas sairão no formato A4, centralizadas e proporcionais
                    </p>
                  </div>
                  <Switch
                    checked={standardizeSize}
                    onCheckedChange={handleStandardizeChange}
                  />
                </div>

                {/* Merge / Download button */}
                <Button
                  onClick={mergePdfs}
                  disabled={isProcessing}
                  size="lg"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-5 text-base font-semibold shadow-lg shadow-indigo-200 transition-all hover:scale-105 active:scale-95"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Processando…
                    </>
                  ) : files.length === 1 ? (
                    <>
                      <Download className="w-5 h-5 mr-2" />
                      Baixar PDF
                    </>
                  ) : (
                    <>
                      <Merge className="w-5 h-5 mr-2" />
                      Mesclar PDFs
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {files.length === 0 && (
          <div className="mt-12 text-center text-slate-400">
            <FilePlus className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nenhum PDF carregado ainda</p>
            <p className="text-xs mt-1">Adicione arquivos para começar</p>
          </div>
        )}
      </main>

      {preview && (
        <div
          className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="relative max-h-[92vh] max-w-[95vw] w-fit rounded-lg border border-zinc-800 bg-zinc-900 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-12 px-4 border-b border-zinc-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 min-w-0 text-sm text-zinc-300">
                <Eye className="w-4 h-4 text-indigo-300 shrink-0" />
                <span className="truncate">{preview.file.name}</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => goToPreviewPage('prev')}
                  disabled={preview.pageNumber <= 1 || preview.loading}
                  className="h-8 w-8 p-0 text-zinc-400 hover:text-indigo-300"
                  title="Pagina anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="min-w-16 text-center text-xs text-zinc-400">
                  {preview.pageNumber} / {preview.file.pageCount ?? 1}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => goToPreviewPage('next')}
                  disabled={preview.pageNumber >= (preview.file.pageCount ?? 1) || preview.loading}
                  className="h-8 w-8 p-0 text-zinc-400 hover:text-indigo-300"
                  title="Proxima pagina"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreview(null)}
                  className="h-8 w-8 p-0 text-zinc-400 hover:text-red-400"
                  title="Fechar"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="max-h-[calc(92vh-3rem)] max-w-[95vw] overflow-auto bg-zinc-950 p-4 flex justify-center">
              {preview.image ? (
                <div className="relative">
                  <img
                    src={preview.image}
                    alt={`Pagina ${preview.pageNumber}`}
                    className="max-w-[92vw] max-h-[calc(92vh-5rem)] w-auto h-auto bg-white rounded shadow-lg transition-transform duration-300"
                    style={{ transform: rotationTransform(preview.file.rotation, 0.78) }}
                  />
                  {preview.loading && (
                    <div className="absolute inset-0 rounded bg-zinc-950/25 backdrop-blur-[1px] flex items-center justify-center">
                      <div className="rounded-full bg-zinc-950/80 border border-zinc-700 p-2 text-indigo-300 shadow-lg">
                        <Loader2 className="w-5 h-5 animate-spin" />
                      </div>
                    </div>
                  )}
                </div>
              ) : preview.loading ? (
                <div className="h-96 min-w-80 flex flex-col items-center justify-center text-zinc-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-3 text-indigo-500" />
                  <span className="text-sm">Carregando visualizacao...</span>
                </div>
              ) : (
                <div className="h-96 min-w-80 flex flex-col items-center justify-center text-zinc-500">
                  <FileText className="w-10 h-10 mb-3 opacity-50" />
                  <span className="text-sm">Visualizacao indisponivel</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
