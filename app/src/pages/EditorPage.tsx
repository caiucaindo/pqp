import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PDFDocument, degrees } from 'pdf-lib';
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
  CornerUpLeft,
  CornerUpRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { downloadPdf } from '@/lib/download';

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
  rotation?: number; // degrees
}

type TransformHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | 'rotate';

interface DragState {
  x: number;
  y: number;
  imgX: number;
  imgY: number;
  imgW: number;
  imgH: number;
  startAngle?: number;
  startImgRotation?: number;
  startCenterX?: number;
  startCenterY?: number;
}

/* ── constants ────────────────────────────────────────────────── */
const HANDLE_SIZE = 10;
const MIN_IMG_SIZE = 40;
const ROTATE_HANDLE_OFFSET = 26;

// Cache loaded Image elements to avoid reloading on every draw
const imagesCache: Record<string, HTMLImageElement> = {};

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
  const [mode, setMode] = useState<'idle' | 'dragging' | 'resizing' | 'rotating'>('idle');
  const [resizeHandle, setResizeHandle] = useState<TransformHandle | null>(null);
  const dragStartRef = useRef<DragState>({ x: 0, y: 0, imgX: 0, imgY: 0, imgW: 0, imgH: 0 });

  /* Processing */
  const [isProcessing, setIsProcessing] = useState(false);
  const [, setIsPdfLoading] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  /* Zoom */
  const [zoom, setZoom] = useState(1);

  /* PDF background cache */
  const pdfBackgroundRef = useRef<ImageData | null>(null);

  /* History (undo / redo) */
  const historyRef = useRef<{
    past: Array<{ placedImages: PlacedImage[]; selectedImageId: string | null }>;
    future: Array<{ placedImages: PlacedImage[]; selectedImageId: string | null }>;
  }>({ past: [], future: [] });
  const [, setHistoryVersion] = useState(0);

  const pushHistory = () => {
    // snapshot current state
    const snapshot = {
      placedImages: JSON.parse(JSON.stringify(placedImages)) as PlacedImage[],
      selectedImageId,
    };
    historyRef.current.past.push(snapshot);
    historyRef.current.future = [];
    setHistoryVersion((v) => v + 1);
  };

  const undo = () => {
    const h = historyRef.current;
    if (h.past.length === 0) return;
    const snap = h.past.pop();
    if (!snap) return;
    // push present to future
    h.future.push({ placedImages: JSON.parse(JSON.stringify(placedImages)), selectedImageId });
    setPlacedImages(snap.placedImages);
    setSelectedImageId(snap.selectedImageId);
    setHistoryVersion((v) => v + 1);
  };

  const redo = () => {
    const h = historyRef.current;
    if (h.future.length === 0) return;
    const snap = h.future.pop();
    if (!snap) return;
    h.past.push({ placedImages: JSON.parse(JSON.stringify(placedImages)), selectedImageId });
    setPlacedImages(snap.placedImages);
    setSelectedImageId(snap.selectedImageId);
    setHistoryVersion((v) => v + 1);
  };

  // Keyboard shortcuts: Ctrl/Cmd+Z = undo, Ctrl/Cmd+Y or Ctrl+Shift+Z = redo
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const ctrl = isMac ? ev.metaKey : ev.ctrlKey;
      if (!ctrl) return;
      const key = ev.key.toLowerCase();
      if (key === 'z' && !ev.shiftKey) {
        ev.preventDefault();
        undo();
      } else if (key === 'y' || (key === 'z' && ev.shiftKey)) {
        ev.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      const imageEl = imagesCache[img.id] || (() => {
        const im = new Image();
        im.src = img.src;
        im.onload = () => {
          imagesCache[img.id] = im;
          // trigger redraw
          if (canvasRef.current) {
            const c = canvasRef.current.getContext('2d');
            if (c) {
              // simple redraw by putting cached background and re-running effect
              c.putImageData(pdfBackgroundRef.current!, 0, 0);
            }
          }
        };
        return im;
      })();

      if (imageEl.complete) {
        // draw with rotation if present
        const rot = img.rotation || 0;
        const cx = img.x + img.width / 2;
        const cy = img.y + img.height / 2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate((rot * Math.PI) / 180);
        ctx.drawImage(imageEl, -img.width / 2, -img.height / 2, img.width, img.height);
        ctx.restore();
      }
    }

    // Draw selection border if selected
    if (selectedImageId) {
      const img = placedImages.find((i) => i.id === selectedImageId);
      if (img && !img.confirmed) {
        const rot = ((img.rotation || 0) * Math.PI) / 180;
        const cx = img.x + img.width / 2;
        const cy = img.y + img.height / 2;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);

        // transformation box
        ctx.strokeStyle = '#4f46e5';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(-img.width / 2, -img.height / 2, img.width, img.height);
        ctx.setLineDash([]);

        // rotation guide line
        ctx.beginPath();
        ctx.moveTo(0, -img.height / 2);
        ctx.lineTo(0, -img.height / 2 - ROTATE_HANDLE_OFFSET);
        ctx.strokeStyle = '#818cf8';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Draw handles in local coordinates so they rotate together with the box
        const hw = img.width / 2;
        const hh = img.height / 2;
        const localHandles: Record<TransformHandle, { x: number; y: number }> = {
          nw: { x: -hw, y: -hh },
          ne: { x: hw, y: -hh },
          sw: { x: -hw, y: hh },
          se: { x: hw, y: hh },
          n: { x: 0, y: -hh },
          s: { x: 0, y: hh },
          e: { x: hw, y: 0 },
          w: { x: -hw, y: 0 },
          rotate: { x: 0, y: -hh - ROTATE_HANDLE_OFFSET },
        };

        for (const [key, pos] of Object.entries(localHandles) as [TransformHandle, { x: number; y: number }][]) {
          if (key === 'rotate') {
            ctx.beginPath();
            ctx.fillStyle = '#312e81';
            ctx.arc(pos.x, pos.y, HANDLE_SIZE / 2 + 1, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.stroke();
            continue;
          }

          ctx.fillStyle = '#4f46e5';
          ctx.fillRect(pos.x - HANDLE_SIZE / 2, pos.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.strokeRect(pos.x - HANDLE_SIZE / 2, pos.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
        }

        ctx.restore();
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
      // clear history on new PDF
      historyRef.current.past = [];
      historyRef.current.future = [];
      setHistoryVersion((v) => v + 1);
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
          rotation: 0,
        };
        // cache the image element to avoid reloading during drawing
        const imageEl = new Image();
        imageEl.src = newImg.src;
        imagesCache[newImg.id] = imageEl;

        // push history before adding
        pushHistory();
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

  /* ── geometry helpers for rotated transforms ───────────────── */
  function getImageCenter(img: PlacedImage) {
    return { x: img.x + img.width / 2, y: img.y + img.height / 2 };
  }

  function worldToLocal(mx: number, my: number, img: PlacedImage) {
    const { x: cx, y: cy } = getImageCenter(img);
    const rad = -((img.rotation || 0) * Math.PI) / 180;
    const dx = mx - cx;
    const dy = my - cy;
    return {
      x: dx * Math.cos(rad) - dy * Math.sin(rad),
      y: dx * Math.sin(rad) + dy * Math.cos(rad),
    };
  }

  function localToWorld(lx: number, ly: number, img: PlacedImage) {
    const { x: cx, y: cy } = getImageCenter(img);
    const rad = ((img.rotation || 0) * Math.PI) / 180;
    return {
      x: cx + lx * Math.cos(rad) - ly * Math.sin(rad),
      y: cy + lx * Math.sin(rad) + ly * Math.cos(rad),
    };
  }

  function getHandlePositions(img: PlacedImage): Record<TransformHandle, { x: number; y: number }> {
    const hw = img.width / 2;
    const hh = img.height / 2;
    return {
      nw: localToWorld(-hw, -hh, img),
      ne: localToWorld(hw, -hh, img),
      sw: localToWorld(-hw, hh, img),
      se: localToWorld(hw, hh, img),
      n: localToWorld(0, -hh, img),
      s: localToWorld(0, hh, img),
      e: localToWorld(hw, 0, img),
      w: localToWorld(-hw, 0, img),
      rotate: localToWorld(0, -hh - ROTATE_HANDLE_OFFSET, img),
    };
  }

  function hitTestHandle(mx: number, my: number, img: PlacedImage): TransformHandle | null {
    const handles = getHandlePositions(img);
    for (const [k, pos] of Object.entries(handles) as [TransformHandle, { x: number; y: number }][]) {
      const dist = Math.hypot(mx - pos.x, my - pos.y);
      if (dist <= HANDLE_SIZE) return k;
    }
    return null;
  }

  function hitTestImage(mx: number, my: number, img: PlacedImage): boolean {
    const local = worldToLocal(mx, my, img);
    return (
      local.x >= -img.width / 2 &&
      local.x <= img.width / 2 &&
      local.y >= -img.height / 2 &&
      local.y <= img.height / 2
    );
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
          if (handle === 'rotate') {
            // record state for undo
            pushHistory();
            const center = getImageCenter(img);
            const startAngle = Math.atan2(y - center.y, x - center.x);
            setMode('rotating');
            setResizeHandle('rotate');
            dragStartRef.current = {
              x,
              y,
              imgX: img.x,
              imgY: img.y,
              imgW: img.width,
              imgH: img.height,
              startAngle,
              startImgRotation: img.rotation || 0,
              startCenterX: center.x,
              startCenterY: center.y,
            };
            return;
          }

          // record state for undo
          pushHistory();
          setMode('resizing');
          setResizeHandle(handle);
          const center = getImageCenter(img);
          dragStartRef.current = {
            x,
            y,
            imgX: img.x,
            imgY: img.y,
            imgW: img.width,
            imgH: img.height,
            startCenterX: center.x,
            startCenterY: center.y,
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
        // record state for undo
        pushHistory();
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
    if (!canvasRef.current) return;
    const { x, y } = getCanvasCoords(e);
    const start = dragStartRef.current;

    const cursorMap: Record<TransformHandle, string> = {
      n: 'ns-resize',
      s: 'ns-resize',
      e: 'ew-resize',
      w: 'ew-resize',
      ne: 'nesw-resize',
      sw: 'nesw-resize',
      nw: 'nwse-resize',
      se: 'nwse-resize',
      rotate: 'crosshair',
    };

    // hover detection when idle
    if (mode === 'idle') {
      const canvas = canvasRef.current;
      if (selectedImageId) {
        const selected = placedImages.find((i) => i.id === selectedImageId);
        if (selected && !selected.confirmed) {
          const hoveredHandle = hitTestHandle(x, y, selected);
          if (hoveredHandle) {
            canvas.style.cursor = cursorMap[hoveredHandle];
            return;
          }
          if (hitTestImage(x, y, selected)) {
            canvas.style.cursor = 'move';
            return;
          }
        }
      }

      // fallback hover on other images
      const target = [...placedImages].reverse().find((img) => hitTestImage(x, y, img));
      if (target) {
        canvas.style.cursor = 'move';
      } else {
        canvas.style.cursor = 'crosshair';
      }
    }

    if (mode === 'dragging' && selectedImageId) {
      const dx = x - start.x;
      const dy = y - start.y;
      setPlacedImages((prev) =>
        prev.map((img) =>
          img.id === selectedImageId ? { ...img, x: start.imgX + dx, y: start.imgY + dy } : img
        )
      );
    } else if (mode === 'resizing' && selectedImageId && resizeHandle && resizeHandle !== 'rotate') {
      const startRotation = ((placedImages.find((i) => i.id === selectedImageId)?.rotation || 0) * Math.PI) / 180;
      const scx = start.startCenterX ?? (start.imgX + start.imgW / 2);
      const scy = start.startCenterY ?? (start.imgY + start.imgH / 2);

      // mouse in local coords of image at drag start
      const localX = (x - scx) * Math.cos(-startRotation) - (y - scy) * Math.sin(-startRotation);
      const localY = (x - scx) * Math.sin(-startRotation) + (y - scy) * Math.cos(-startRotation);
      const isCorner = ['nw', 'ne', 'sw', 'se'].includes(resizeHandle as string);
      const keepAspect = isCorner || e.shiftKey;

      setPlacedImages((prev) =>
        prev.map((img) => {
          if (img.id !== selectedImageId) return img;

          const left0 = -start.imgW / 2;
          const right0 = start.imgW / 2;
          const top0 = -start.imgH / 2;
          const bottom0 = start.imgH / 2;

          let left = left0;
          let right = right0;
          let top = top0;
          let bottom = bottom0;

          switch (resizeHandle) {
            case 'e':
              right = Math.max(left0 + MIN_IMG_SIZE, localX);
              break;
            case 'w':
              left = Math.min(right0 - MIN_IMG_SIZE, localX);
              break;
            case 'n':
              top = Math.min(bottom0 - MIN_IMG_SIZE, localY);
              break;
            case 's':
              bottom = Math.max(top0 + MIN_IMG_SIZE, localY);
              break;
            case 'se':
              right = Math.max(left0 + MIN_IMG_SIZE, localX);
              bottom = Math.max(top0 + MIN_IMG_SIZE, localY);
              break;
            case 'nw':
              left = Math.min(right0 - MIN_IMG_SIZE, localX);
              top = Math.min(bottom0 - MIN_IMG_SIZE, localY);
              break;
            case 'ne':
              right = Math.max(left0 + MIN_IMG_SIZE, localX);
              top = Math.min(bottom0 - MIN_IMG_SIZE, localY);
              break;
            case 'sw':
              left = Math.min(right0 - MIN_IMG_SIZE, localX);
              bottom = Math.max(top0 + MIN_IMG_SIZE, localY);
              break;
          }

          let newW = Math.max(MIN_IMG_SIZE, right - left);
          let newH = Math.max(MIN_IMG_SIZE, bottom - top);
          let localCenterX = (left + right) / 2;
          let localCenterY = (top + bottom) / 2;

          if (keepAspect) {
            // Preserve aspect ratio anchored to the opposite side of the handle
            let scale = 1;
            if (resizeHandle === 'n' || resizeHandle === 's') {
              scale = newH / start.imgH;
            } else if (resizeHandle === 'e' || resizeHandle === 'w') {
              scale = newW / start.imgW;
            } else {
              const sw = newW / start.imgW;
              const sh = newH / start.imgH;
              scale = Math.max(sw, sh);
            }

            scale = Math.max(MIN_IMG_SIZE / start.imgW, scale);
            const finalW = Math.max(MIN_IMG_SIZE, start.imgW * scale);
            const finalH = Math.max(MIN_IMG_SIZE, start.imgH * scale);

            const anchorLocalX = resizeHandle.includes('w') ? right0 : resizeHandle.includes('e') ? left0 : 0;
            const anchorLocalY = resizeHandle.includes('n') ? bottom0 : resizeHandle.includes('s') ? top0 : 0;

            if (anchorLocalX === left0) localCenterX = anchorLocalX + finalW / 2;
            else if (anchorLocalX === right0) localCenterX = anchorLocalX - finalW / 2;
            else localCenterX = 0;

            if (anchorLocalY === top0) localCenterY = anchorLocalY + finalH / 2;
            else if (anchorLocalY === bottom0) localCenterY = anchorLocalY - finalH / 2;
            else localCenterY = 0;

            newW = finalW;
            newH = finalH;
          }

          const wcx = scx + (localCenterX * Math.cos(startRotation) - localCenterY * Math.sin(startRotation));
          const wcy = scy + (localCenterX * Math.sin(startRotation) + localCenterY * Math.cos(startRotation));

          return {
            ...img,
            x: wcx - newW / 2,
            y: wcy - newH / 2,
            width: newW,
            height: newH,
          };
        })
      );
    } else if (mode === 'rotating' && selectedImageId) {
        const img = placedImages.find((i) => i.id === selectedImageId);
        if (!img) return;
        const cx = dragStartRef.current.startCenterX ?? (img.x + img.width / 2);
        const cy = dragStartRef.current.startCenterY ?? (img.y + img.height / 2);
        const currentAngle = Math.atan2(y - cy, x - cx);
        const startAngle = dragStartRef.current.startAngle || 0;
        const startImgRotation = dragStartRef.current.startImgRotation || 0;
        const delta = currentAngle - startAngle;
        const deltaDeg = delta * (180 / Math.PI);
        const newRot = (startImgRotation + deltaDeg) % 360;
        setPlacedImages((prev) => prev.map((im) => im.id === selectedImageId ? { ...im, rotation: newRot } : im));
    }
  };

  const handleMouseUp = () => {
    setMode('idle');
    setResizeHandle(null);
    if (canvasRef.current) canvasRef.current.style.cursor = 'crosshair';
  };

  /* ── wheel event for scroll/zoom navigation ─────────────────── */
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    // Ctrl+scroll: zoom
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((z) => Math.max(0.3, Math.min(3, z + delta)));
    // Regular scroll: navigate pages
    } else if (!e.shiftKey) {
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
    pushHistory();
    setPlacedImages((prev) => prev.map((img) => (img.id === id ? { ...img, confirmed: true } : img)));
  };

  const unconfirmImage = (id: string) => {
    pushHistory();
    setPlacedImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, confirmed: false } : img))
    );
    setSelectedImageId(id);
  };

  const removeImage = (id: string) => {
    pushHistory();
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
          rotate: degrees(img.rotation || 0),
        });
      }

      const bytes = await pdfDoc.save();
      const cleanName = pdfFile.name.replace(/\.pdf$/i, '');
      await downloadPdf(bytes, `${cleanName}_editado.pdf`);
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
      className="min-h-screen bg-background text-foreground font-sans flex flex-col"
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleRootDrop}
    >
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

          <div className="max-w-[1400px] mx-auto h-full flex items-center">
            <div className="w-64" />
            <div className="flex-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-emerald-600 p-1.5 rounded-lg">
                  <PenLine className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-lg font-semibold tracking-tight">Editor de PDF</h1>
              </div>

              <div className="flex items-center gap-2">
                {pdfDoc && (
                  <>
                    <span className="text-sm text-zinc-400">
                      Página {currentPage} / {pageCount}
                    </span>
                    {placedImages.length > 0 && (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={undo}
                              disabled={historyRef.current.past.length === 0}
                              className="text-zinc-300"
                            >
                              <CornerUpLeft className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={redo}
                              disabled={historyRef.current.future.length === 0}
                              className="text-zinc-300"
                            >
                              <CornerUpRight className="w-4 h-4" />
                            </Button>

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
                          </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex w-full">
        {/* Sidebar */}
        <aside className="w-64 bg-zinc-900/80 border-r border-zinc-800 p-4 flex flex-col gap-4">
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
              <div className="w-full h-px bg-zinc-800" />

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
                  <span className="text-sm text-zinc-300">
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
                          className="w-full gap-2 border-dashed border-2 border-zinc-700 hover:border-emerald-400 hover:text-emerald-400"
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
                <span className="text-xs text-zinc-400">{Math.round(zoom * 100)}%</span>
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
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
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
                          className="w-full gap-1 text-red-400 hover:text-red-300 hover:bg-red-500/10"
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
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Camadas ({placedImages.length})
                  </p>
                  {placedImages.map((img, idx) => (
                    <div
                      key={img.id}
                      onClick={() => setSelectedImageId(img.id)}
                      className={cn(
                        'flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors text-xs',
                        selectedImageId === img.id
                          ? 'bg-indigo-500/15 text-indigo-200 border border-indigo-500/30'
                          : 'hover:bg-zinc-800 text-zinc-300 border border-transparent'
                      )}
                    >
                      <img
                        src={img.src}
                        alt=""
                        className="w-8 h-8 rounded object-cover border border-zinc-700"
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
        <main className="flex-1 bg-background overflow-auto flex items-start justify-center p-8 relative">
          {isDraggingFile && (
            <div className="absolute inset-0 z-20 m-4 rounded-2xl border-2 border-dashed border-indigo-400 bg-indigo-50/80 backdrop-blur-sm flex items-center justify-center text-indigo-700 pointer-events-none">
              <div className="text-center">
                <p className="text-lg font-semibold">Solte o arquivo aqui</p>
                <p className="text-sm mt-1">PDF abre automaticamente, imagem entra no editor</p>
              </div>
            </div>
          )}
          {!pdfDoc ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-400">
              <FileText className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-base font-medium text-zinc-300">
                Carregue um PDF para começar a editar
              </p>
              <p className="text-sm text-zinc-500 mt-1">
                Adicione imagens, posicione e salve
              </p>
            </div>
          ) : (
            <div
              ref={containerRef}
              className="shadow-2xl rounded-lg overflow-hidden ring-1 ring-zinc-800"
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
