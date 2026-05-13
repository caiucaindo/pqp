import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import {
  ArrowLeft,
  FileText,
  ImagePlus,
  Save,
  Check,
  Move,
  Loader2,
  Trash2,
  ZoomIn,
  ZoomOut,
  PenLine,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).href;

/* ── types ────────────────────────────────────────────────────── */
interface PlacedImage {
  id: string;
  src: string;       // dataURL
  x: number;         // canvas px
  y: number;         // canvas px
  width: number;     // canvas px
  height: number;    // canvas px
  naturalWidth: number;
  naturalHeight: number;
  confirmed: boolean;
}

/* ── constants ────────────────────────────────────────────────── */
const HANDLE_SIZE = 10;
const MIN_IMG_SIZE = 40;

/* ── helper: trigger download ─────────────────────────────────── */
function triggerDownload(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ── Editor Page ──────────────────────────────────────────────── */
export default function EditorPage() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /* PDF state */
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [pdfRenderData, setPdfRenderData] = useState<{
    canvasWidth: number;
    canvasHeight: number;
    pdfWidth: number;
    pdfHeight: number;
  } | null>(null);

  /* Image state */
  const [placedImages, setPlacedImages] = useState<PlacedImage[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  /* Interaction state */
  const [mode, setMode] = useState<'idle' | 'dragging' | 'resizing'>('idle');
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0, imgX: 0, imgY: 0, imgW: 0, imgH: 0 });

  /* Processing */
  const [isProcessing, setIsProcessing] = useState(false);
  const [, setIsPdfLoading] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  /* Zoom */
  const [zoom, setZoom] = useState(1);

  /* PDF background cache */
  const pdfBackgroundRef = useRef<ImageData | null>(null);

  /* ── render PDF to background cache ──────────────────────────── */
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    
    const renderPdfToCache = async () => {
      const page = await pdfDoc.getPage(currentPage);
      const baseScale = 1.5;
      const viewport = page.getViewport({ scale: baseScale });

      const canvas = canvasRef.current!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvas, canvasContext: ctx, viewport }).promise;
      page.cleanup?.();

      // Cache the PDF background
      pdfBackgroundRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);

      setPdfRenderData({
        canvasWidth: viewport.width,
        canvasHeight: viewport.height,
        pdfWidth: viewport.width,
        pdfHeight: viewport.height,
      });
    };

    renderPdfToCache();
  }, [pdfDoc, currentPage]);

  /* ── redraw overlays whenever state changes (fast) ──────────────── */
  useEffect(() => {
    if (!canvasRef.current || !pdfRenderData || !pdfBackgroundRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;

    // Restore cached PDF background
    ctx.putImageData(pdfBackgroundRef.current, 0, 0);

    // Draw placed images
    for (const img of placedImages) {
      const imageEl = new Image();
      imageEl.src = img.src;
      imageEl.onload = () => {
        ctx.drawImage(imageEl, img.x, img.y, img.width, img.height);
      };
    }

    // Draw selection border if selected
    if (selectedImageId) {
      const img = placedImages.find((i) => i.id === selectedImageId);
      if (img && !img.confirmed) {
        ctx.strokeStyle = '#4f46e5';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(img.x, img.y, img.width, img.height);
        ctx.setLineDash([]);

        // Draw resize handles
        const handles = getHandlePositions(img);
        for (const [, pos] of Object.entries(handles)) {
          ctx.fillStyle = '#4f46e5';
          ctx.fillRect(
            pos.x - HANDLE_SIZE / 2,
            pos.y - HANDLE_SIZE / 2,
            HANDLE_SIZE,
            HANDLE_SIZE
          );
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.strokeRect(
            pos.x - HANDLE_SIZE / 2,
            pos.y - HANDLE_SIZE / 2,
            HANDLE_SIZE,
            HANDLE_SIZE
          );
        }
      }
    }
  }, [placedImages, selectedImageId, pdfRenderData]);

  /* ── handle PDF upload ──────────────────────────────────────── */
  const handlePdfUpload = async (file: File) => {
    setIsPdfLoading(true);
    try {
      const buf = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      setPdfFile(file);
      setPdfDoc(pdf);
      setPageCount(pdf.numPages);
      setCurrentPage(1);
      setPlacedImages([]);
      setSelectedImageId(null);
    } catch (err) {
      console.error(err);
      alert('Erro ao carregar PDF');
    } finally {
      setIsPdfLoading(false);
    }
  };

  /* ── handle image upload ────────────────────────────────────── */
  const handleImageUpload = (file: File) => {
    if (!pdfRenderData) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // Default size: 30% of canvas width, maintain aspect ratio
        const maxW = pdfRenderData.canvasWidth * 0.3;
        const scale = Math.min(maxW / img.naturalWidth, 1);
        const w = img.naturalWidth * scale;
        const h = img.naturalHeight * scale;

        // Center on canvas
        const x = (pdfRenderData.canvasWidth - w) / 2;
        const y = (pdfRenderData.canvasHeight - h) / 2;

        const newImg: PlacedImage = {
          id: Math.random().toString(36).substring(2, 11),
          src: reader.result as string,
          x,
          y,
          width: w,
          height: h,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          confirmed: false,
        };
        setPlacedImages((prev) => [...prev, newImg]);
        setSelectedImageId(newImg.id);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDroppedFiles = async (files: FileList | File[]) => {
    const droppedFiles = Array.from(files);
    const pdf = droppedFiles.find((file) => file.type === 'application/pdf');
    const image = droppedFiles.find(
      (file) => file.type === 'image/png' || file.type === 'image/jpeg'
    );

    if (pdf) {
      await handlePdfUpload(pdf);
      return;
    }

    if (image) {
      handleImageUpload(image);
    }
  };

  /* ── handle positions ───────────────────────────────────────── */
  function getHandlePositions(img: PlacedImage) {
    return {
      nw: { x: img.x, y: img.y },
      ne: { x: img.x + img.width, y: img.y },
      sw: { x: img.x, y: img.y + img.height },
      se: { x: img.x + img.width, y: img.y + img.height },
    };
  }

  function hitTestHandle(mx: number, my: number, img: PlacedImage): string | null {
    const handles = getHandlePositions(img);
    for (const [k, pos] of Object.entries(handles)) {
      if (
        mx >= pos.x - HANDLE_SIZE &&
        mx <= pos.x + HANDLE_SIZE &&
        my >= pos.y - HANDLE_SIZE &&
        my <= pos.y + HANDLE_SIZE
      ) {
        return k;
      }
    }
    return null;
  }

  function hitTestImage(mx: number, my: number, img: PlacedImage): boolean {
    return mx >= img.x && mx <= img.x + img.width && my >= img.y && my <= img.y + img.height;
  }

  /* ── canvas mouse events ────────────────────────────────────── */
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const { x, y } = getCanvasCoords(e);

    // Check handles first (selected image)
    if (selectedImageId) {
      const img = placedImages.find((i) => i.id === selectedImageId);
      if (img && !img.confirmed) {
        const handle = hitTestHandle(x, y, img);
        if (handle) {
          setMode('resizing');
          setResizeHandle(handle);
          dragStartRef.current = {
            x,
            y,
            imgX: img.x,
            imgY: img.y,
            imgW: img.width,
            imgH: img.height,
          };
          return;
        }
      }
    }

    // Check images (unconfirmed first)
    const unconfirmed = placedImages.filter((i) => !i.confirmed);
    const confirmed = placedImages.filter((i) => i.confirmed);
    for (const img of [...unconfirmed].reverse()) {
      if (hitTestImage(x, y, img)) {
        setSelectedImageId(img.id);
        setMode('dragging');
        dragStartRef.current = {
          x,
          y,
          imgX: img.x,
          imgY: img.y,
          imgW: img.width,
          imgH: img.height,
        };
        return;
      }
    }

    // Check confirmed images
    for (const img of [...confirmed].reverse()) {
      if (hitTestImage(x, y, img)) {
        setSelectedImageId(img.id);
        // Don't enter drag mode for confirmed images unless we unconfirm
        return;
      }
    }

    // Clicked empty area
    setSelectedImageId(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode === 'idle' || !canvasRef.current) return;
    const { x, y } = getCanvasCoords(e);
    const start = dragStartRef.current;

    if (mode === 'dragging' && selectedImageId) {
      const dx = x - start.x;
      const dy = y - start.y;
      setPlacedImages((prev) =>
        prev.map((img) =>
          img.id === selectedImageId ? { ...img, x: start.imgX + dx, y: start.imgY + dy } : img
        )
      );
    } else if (mode === 'resizing' && selectedImageId && resizeHandle) {
      const dx = x - start.x;

      setPlacedImages((prev) =>
        prev.map((img) => {
          if (img.id !== selectedImageId) return img;

          let newX = img.x;
          let newY = img.y;
          let newW = img.width;
          let newH = img.height;
          const aspect = img.naturalWidth / img.naturalHeight;

          switch (resizeHandle) {
            case 'se':
              newW = Math.max(MIN_IMG_SIZE, start.imgW + dx);
              newH = newW / aspect;
              break;
            case 'nw':
              newW = Math.max(MIN_IMG_SIZE, start.imgW - dx);
              newH = newW / aspect;
              newX = start.imgX + start.imgW - newW;
              newY = start.imgY + start.imgH - newH;
              break;
            case 'ne':
              newW = Math.max(MIN_IMG_SIZE, start.imgW + dx);
              newH = newW / aspect;
              newY = start.imgY + start.imgH - newH;
              break;
            case 'sw':
              newW = Math.max(MIN_IMG_SIZE, start.imgW - dx);
              newH = newW / aspect;
              newX = start.imgX + start.imgW - newW;
              break;
          }

          // Clamp to canvas bounds
          if (newX < 0) { newX = 0; }
          if (newY < 0) { newY = 0; }
          if (newX + newW > (pdfRenderData?.canvasWidth || Infinity)) {
            newW = (pdfRenderData?.canvasWidth || newX + newW) - newX;
            newH = newW / aspect;
          }
          if (newY + newH > (pdfRenderData?.canvasHeight || Infinity)) {
            newH = (pdfRenderData?.canvasHeight || newY + newH) - newY;
            newW = newH * aspect;
          }

          return { ...img, x: newX, y: newY, width: newW, height: newH };
        })
      );
    }
  };

  const handleMouseUp = () => {
    setMode('idle');
    setResizeHandle(null);
  };

  /* ── wheel event for scroll/zoom navigation ─────────────────── */
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    // Ctrl+scroll: zoom
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((z) => Math.max(0.3, Math.min(3, z + delta)));
    } 
    // Regular scroll: navigate pages
    else if (!e.shiftKey) {
      e.preventDefault();
      if (e.deltaY > 0) {
        // Scroll down: next page
        setCurrentPage((p) => Math.min(pageCount, p + 1));
      } else {
        // Scroll up: prev page
        setCurrentPage((p) => Math.max(1, p - 1));
      }
    }
  };

  /* ── drag and drop ──────────────────────────────────────────── */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(true);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDraggingFile(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
    void handleDroppedFiles(e.dataTransfer.files);
  };

  const handleRootDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
    void handleDroppedFiles(e.dataTransfer.files);
  };

  /* ── confirm / unconfirm ────────────────────────────────────── */
  const confirmImage = (id: string) => {
    setPlacedImages((prev) => prev.map((img) => (img.id === id ? { ...img, confirmed: true } : img)));
  };

  const unconfirmImage = (id: string) => {
    setPlacedImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, confirmed: false } : img))
    );
    setSelectedImageId(id);
  };

  const removeImage = (id: string) => {
    setPlacedImages((prev) => prev.filter((img) => img.id !== id));
    if (selectedImageId === id) setSelectedImageId(null);
  };

  /* ── save edited PDF ────────────────────────────────────────── */
  const savePdf = async () => {
    if (!pdfFile || placedImages.length === 0) return;
    setIsProcessing(true);
    try {
      const buf = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buf);

      // Get the current page
      const page = pdfDoc.getPage(currentPage - 1);
      const { width: pageW, height: pageH } = page.getSize();

      // Calculate scale: PDF page size -> canvas size
      if (!pdfRenderData) return;
      const scaleX = pageW / pdfRenderData.canvasWidth;
      const scaleY = pageH / pdfRenderData.canvasHeight;

      for (const img of placedImages) {
        // Convert dataURL to bytes
        const res = await fetch(img.src);
        const imgBytes = new Uint8Array(await res.arrayBuffer());

        // Try PNG first, then JPG
        let embeddedImg;
        try {
          embeddedImg = await pdfDoc.embedPng(imgBytes);
        } catch {
          embeddedImg = await pdfDoc.embedJpg(imgBytes);
        }

        // Convert canvas coords to PDF coords
        // PDF: bottom-left origin. Canvas: top-left origin.
        const pdfX = img.x * scaleX;
        const pdfY = pageH - (img.y + img.height) * scaleY;
        const pdfW = img.width * scaleX;
        const pdfH = img.height * scaleY;

        page.drawImage(embeddedImg, {
          x: pdfX,
          y: pdfY,
          width: pdfW,
          height: pdfH,
        });
      }

      const bytes = await pdfDoc.save();
      const cleanName = pdfFile.name.replace(/\.pdf$/i, '');
      triggerDownload(bytes, `${cleanName}_editado.pdf`);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar PDF. Verifique se os arquivos são válidos.');
    } finally {
      setIsProcessing(false);
    }
  };

  /* ── file input handlers ────────────────────────────────────── */
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);

  const onPdfInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      handlePdfUpload(e.target.files[0]);
      e.target.value = '';
    }
  };

  const onImgInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      handleImageUpload(e.target.files[0]);
      e.target.value = '';
    }
  };

  return (
    <div
      className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col"
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleRootDrop}
    >
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="text-slate-500 hover:text-indigo-600 gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-xs">Voltar</span>
            </Button>
            <div className="w-px h-6 bg-slate-200" />
            <div className="flex items-center gap-2">
              <div className="bg-emerald-600 p-1.5 rounded-lg">
                <PenLine className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-lg font-semibold tracking-tight">Editor de PDF</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {pdfDoc && (
              <>
                <span className="text-sm text-slate-500">
                  Página {currentPage} / {pageCount}
                </span>
                {placedImages.length > 0 && (
                  <Button
                    onClick={savePdf}
                    disabled={isProcessing}
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span className="text-sm">Salvar PDF</span>
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex max-w-[1400px] mx-auto w-full">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 p-4 flex flex-col gap-4">
          {/* Upload PDF */}
          <div>
            <input
              ref={pdfInputRef}
              type="file"
              accept=".pdf"
              onChange={onPdfInputChange}
              className="hidden"
            />
            <Button
              variant={pdfDoc ? 'outline' : 'default'}
              className={cn(
                'w-full gap-2',
                !pdfDoc && 'bg-indigo-600 hover:bg-indigo-700 text-white'
              )}
              onClick={() => pdfInputRef.current?.click()}
            >
              <FileText className="w-4 h-4" />
              {pdfDoc ? 'Trocar PDF' : 'Carregar PDF'}
            </Button>
          </div>

          {pdfDoc && (
            <>
              <div className="w-full h-px bg-slate-200" />

              {/* Page navigation */}
              {pageCount > 1 && (
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-slate-600">
                    {currentPage} / {pageCount}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={currentPage >= pageCount}
                    onClick={() => setCurrentPage((p) => p + 1)}
                  >
                    <ArrowLeft className="w-4 h-4 rotate-180" />
                  </Button>
                </div>
              )}

              {/* Add Image */}
              <div>
                <input
                  ref={imgInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg"
                  onChange={onImgInputChange}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  className="w-full gap-2 border-dashed border-2 hover:border-emerald-400 hover:text-emerald-600"
                  onClick={() => imgInputRef.current?.click()}
                >
                  <ImagePlus className="w-4 h-4" />
                  Adicionar Imagem
                </Button>
              </div>

              {/* Zoom */}
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setZoom((z) => Math.max(0.3, z - 0.1))}
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-xs text-slate-500">{Math.round(zoom * 100)}%</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>

              <div className="w-full h-px bg-slate-200" />

              {/* Selected image controls */}
              {selectedImageId && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Imagem Selecionada
                  </p>

                  {(() => {
                    const img = placedImages.find((i) => i.id === selectedImageId);
                    if (!img) return null;
                    return (
                      <div className="space-y-2">
                        {!img.confirmed ? (
                          <Button
                            variant="default"
                            size="sm"
                            className="w-full gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => confirmImage(img.id)}
                          >
                            <Check className="w-4 h-4" />
                            Confirmar
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full gap-1"
                            onClick={() => unconfirmImage(img.id)}
                          >
                            <Move className="w-4 h-4" />
                            Reposicionar
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full gap-1 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => removeImage(img.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                          Remover
                        </Button>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Images list */}
              {placedImages.length > 0 && (
                <div className="space-y-1 flex-1 overflow-auto">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Camadas ({placedImages.length})
                  </p>
                  {placedImages.map((img, idx) => (
                    <div
                      key={img.id}
                      onClick={() => setSelectedImageId(img.id)}
                      className={cn(
                        'flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors text-xs',
                        selectedImageId === img.id
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : 'hover:bg-slate-50 text-slate-600 border border-transparent'
                      )}
                    >
                      <img
                        src={img.src}
                        alt=""
                        className="w-8 h-8 rounded object-cover border border-slate-200"
                      />
                      <span className="truncate flex-1">Imagem {idx + 1}</span>
                      {img.confirmed ? (
                        <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                      ) : (
                        <Move className="w-3 h-3 text-amber-500 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </aside>

        {/* Canvas area */}
        <main className="flex-1 bg-slate-100 overflow-auto flex items-start justify-center p-8 relative">
          {isDraggingFile && (
            <div className="absolute inset-0 z-20 m-4 rounded-2xl border-2 border-dashed border-indigo-400 bg-indigo-50/80 backdrop-blur-sm flex items-center justify-center text-indigo-700 pointer-events-none">
              <div className="text-center">
                <p className="text-lg font-semibold">Solte o arquivo aqui</p>
                <p className="text-sm mt-1">PDF abre automaticamente, imagem entra no editor</p>
              </div>
            </div>
          )}
          {!pdfDoc ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <FileText className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-base font-medium text-slate-500">
                Carregue um PDF para começar a editar
              </p>
              <p className="text-sm text-slate-400 mt-1">
                Adicione imagens, posicione e salve
              </p>
            </div>
          ) : (
            <div
              ref={containerRef}
              className="shadow-2xl rounded-lg overflow-hidden bg-white"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'top center',
              }}
            >
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  'block cursor-crosshair select-none',
                  mode === 'dragging' && 'cursor-move',
                  mode === 'resizing' && 'cursor-nwse-resize'
                )}
                style={{ maxWidth: '100%' }}
              />
            </div>
          )}
        </main>
      </div>

      {/* Hidden inputs */}
      <input
        ref={pdfInputRef}
        type="file"
        accept=".pdf"
        onChange={onPdfInputChange}
        className="hidden"
      />
      <input
        ref={imgInputRef}
        type="file"
        accept=".png,.jpg,.jpeg"
        onChange={onImgInputChange}
        className="hidden"
      />
    </div>
  );
}
