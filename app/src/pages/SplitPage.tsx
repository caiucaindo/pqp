import { useState, useRef, useCallback } from 'react';
import { PDFDocument, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import {
  Upload,
  RotateCw,
  RotateCcw,
  Loader2,
  Download,
  Package,
  X,
  Scissors,
  Eye,
  Link2,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { downloadBytes, downloadPdf } from '@/lib/download';
import { createZip } from '@/lib/zip';
import { PageHeader, pageContentLayout } from '@/components/PageHeader';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).href;

interface PdfPage {
  id: string;
  pageNumber: number;
  name: string;
  rotation: number;
  thumbnail?: string;
  selected?: boolean;
  sourceFile: File;
  sourcePageNumber: number;
}

interface PreviewState {
  page: PdfPage;
  image?: string;
  loading: boolean;
}

function rotationLabel(deg: number) {
  switch (deg) {
    case 0: return '0°';
    case 90: return '90°';
    case 180: return '180°';
    case 270: return '270°';
    default: return `${deg}°`;
  }
}

function sanitizeFilename(name: string) {
  return name
    .replace(/\.pdf$/i, '')
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .trim() || 'arquivo';
}

function getOutputGroupsFrom(pages: PdfPage[], cutsAfter: boolean[]) {
  const groups: PdfPage[][] = [];
  let current: PdfPage[] = [];

  pages.forEach((page, index) => {
    current.push(page);
    if (index === pages.length - 1 || (cutsAfter[index] ?? true)) {
      groups.push(current);
      current = [];
    }
  });

  return groups;
}

function getCutsFromGroups(groups: PdfPage[][]) {
  const cuts: boolean[] = [];

  groups.forEach((group, groupIndex) => {
    group.forEach((_, pageIndex) => {
      const isLastPageInGroup = pageIndex === group.length - 1;
      const isLastGroup = groupIndex === groups.length - 1;
      if (!isLastPageInGroup) cuts.push(false);
      if (isLastPageInGroup && !isLastGroup) cuts.push(true);
    });
  });

  return cuts;
}

async function generatePageImage(file: File, pageNumber: number, scale = 0.6): Promise<string> {
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
  const dataUrl = canvas.toDataURL('image/jpeg', 0.82);

  page.cleanup?.();
  loadingTask.destroy?.();
  return dataUrl;
}

async function createPdfFromPages(pagesToExport: PdfPage[]): Promise<Uint8Array> {
  if (pagesToExport.length === 0) {
    throw new Error('No pages to export');
  }

  const loadedDocs = new Map<File, PDFDocument>();
  const output = await PDFDocument.create();

  for (const page of pagesToExport) {
    let src = loadedDocs.get(page.sourceFile);
    if (!src) {
      const buf = await page.sourceFile.arrayBuffer();
      src = await PDFDocument.load(buf);
      loadedDocs.set(page.sourceFile, src);
    }

    const [copiedPage] = await output.copyPages(src, [page.sourcePageNumber - 1]);
    if (page.rotation !== 0) {
      copiedPage.setRotation(degrees(page.rotation));
    }
    output.addPage(copiedPage);
  }

  return output.save();
}

export default function SplitPage() {
  const [sourceFileName, setSourceFileName] = useState<string | null>(null);
  const [pages, setPages] = useState<PdfPage[]>([]);
  const [cutsAfter, setCutsAfter] = useState<boolean[]>([]);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const appendModeRef = useRef(false);
  const standardContentLayout = pageContentLayout('standard');
  const wideContentLayout = pageContentLayout('wide');

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const loadPdf = async (pdfFile: File, append: boolean) => {
    if (!append) {
      setIsLoading(true);
    }
    setPreview(null);

    try {
      const buf = await pdfFile.arrayBuffer();
      const pdf = await PDFDocument.load(buf, { updateMetadata: false });
      const pageCount = pdf.getPageCount();
      const startNumber = append ? pages.length + 1 : 1;
      const newPages: PdfPage[] = Array.from({ length: pageCount }, (_, i) => ({
        id: Math.random().toString(36).slice(2, 11),
        pageNumber: startNumber + i,
        name: `${sanitizeFilename(pdfFile.name)}_pagina_${startNumber + i}`,
        rotation: 0,
        selected: false,
        sourceFile: pdfFile,
        sourcePageNumber: i + 1,
      }));

      setPages((prev) => {
        const base = append ? prev : [];
        return [...base, ...newPages];
      });

      setCutsAfter((prevCuts) => {
        if (!append) {
          return Array.from({ length: Math.max(pageCount - 1, 0) }, () => true);
        }
        const prevCount = pages.length;
        const combinedCount = prevCount + pageCount;
        const next = [...prevCuts];
        if (prevCount > 0) next.push(true);
        for (let i = 0; i < pageCount - 1; i += 1) next.push(true);
        return next.slice(0, Math.max(combinedCount - 1, 0));
      });

      if (!append || !sourceFileName) {
        setSourceFileName(pdfFile.name);
      }

      await Promise.all(
        newPages.map(async (page) => {
          try {
            const thumbnail = await generatePageImage(pdfFile, page.sourcePageNumber);
            setPages((prev) =>
              prev.map((p) => (p.id === page.id ? { ...p, thumbnail } : p))
            );
          } catch {
            // ignore isolated thumb failures
          }
        })
      );
    } catch (err) {
      console.error(err);
      alert('Erro ao carregar PDF. Verifique se o arquivo não está corrompido.');
    } finally {
      if (!append) {
        setIsLoading(false);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files).find((f) => f.type === 'application/pdf');
    if (dropped) {
      void loadPdf(dropped, false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    const append = appendModeRef.current;
    appendModeRef.current = false;
    void loadPdf(selected, append);
    e.target.value = '';
  };

  const removeAllFiles = () => {
    setSourceFileName(null);
    setPages([]);
    setCutsAfter([]);
    setPreview(null);
    appendModeRef.current = false;
  };

  const removePage = (id: string) => {
    setPages((prevPages) => {
      const groups = getOutputGroupsFrom(prevPages, cutsAfter);
      const filteredGroups = groups
        .map((group) => group.filter((p) => p.id !== id))
        .filter((group) => group.length > 0);
      const flattened = filteredGroups.flat().map((p, idx) => ({ ...p, pageNumber: idx + 1 }));
      setCutsAfter(getCutsFromGroups(filteredGroups));
      if (flattened.length === 0) {
        setSourceFileName(null);
        setPreview(null);
      }
      return flattened;
    });
  };

  const toggleCut = (index: number) => {
    setCutsAfter((prev) => prev.map((cut, i) => (i === index ? !cut : cut)));
  };

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

  const openPreview = async (page: PdfPage) => {
    setPreview({ page, loading: true });
    try {
      const image = await generatePageImage(page.sourceFile, page.sourcePageNumber, 1.5);
      setPreview({ page, image, loading: false });
    } catch (err) {
      console.error(err);
      setPreview(null);
      alert('Erro ao gerar visualização da página.');
    }
  };

  const downloadPage = async (page: PdfPage) => {
    setIsProcessing(true);
    try {
      const bytes = await createPdfFromPages([page]);
      await downloadPdf(bytes, `${sanitizeFilename(page.name)}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Erro ao extrair página.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadSelected = async () => {
    const selectedIds = new Set(pages.filter((p) => p.selected).map((p) => p.id));
    if (selectedIds.size === 0) return;
    setIsProcessing(true);
    try {
      const selectedGroups = getOutputGroups()
        .map((group) => group.filter((page) => selectedIds.has(page.id)))
        .filter((group) => group.length > 0);

      if (selectedGroups.length === 1) {
        const bytes = await createPdfFromPages(selectedGroups[0]);
        await downloadPdf(bytes, `selected_${new Date().toISOString().slice(0, 10)}.pdf`);
        return;
      }

      const entries = await Promise.all(
        selectedGroups.map(async (group) => ({
          filename: getGroupFilename(group),
          bytes: await createPdfFromPages(group),
        }))
      );
      const zipBytes = createZip(entries);
      await downloadBytes(zipBytes, `selected_${new Date().toISOString().slice(0, 10)}.zip`, 'application/zip');
    } catch (err) {
      console.error(err);
      alert('Erro ao baixar páginas selecionadas.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getOutputGroups = () => getOutputGroupsFrom(pages, cutsAfter);

  const getGroupFilename = (group: PdfPage[]) => {
    if (group.length === 1) {
      return `${sanitizeFilename(group[0].name)}.pdf`;
    }
    const base = sanitizeFilename(sourceFileName || 'pdf');
    const first = group[0].pageNumber;
    const last = group[group.length - 1].pageNumber;
    return `${base}_paginas_${first}-${last}.pdf`;
  };

  const downloadAll = async () => {
    if (pages.length === 0) return;
    setIsProcessing(true);
    try {
      const entries = await Promise.all(
        getOutputGroups().map(async (group) => ({
          filename: getGroupFilename(group),
          bytes: await createPdfFromPages(group),
        }))
      );
      const zipBytes = createZip(entries);
      const base = sanitizeFilename(sourceFileName || 'pdf_separado');
      await downloadBytes(zipBytes, `${base}_separado.zip`, 'application/zip');
    } catch (err) {
      console.error(err);
      alert('Erro ao extrair páginas.');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleSelect = (id: string) => {
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, selected: !p.selected } : p)));
  };

  const triggerAddPdf = () => {
    appendModeRef.current = true;
    fileInputRef.current?.click();
  };

  const selectedCount = pages.filter((p) => p.selected).length;
  const outputGroupCount = getOutputGroups().length;
  const activeContentLayout = sourceFileName && pages.length > 0 ? wideContentLayout : standardContentLayout;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <PageHeader
        title="Separar PDF"
        icon={<Scissors className="w-5 h-5 text-white" />}
        iconClassName="bg-amber-600"
        contentClassName={activeContentLayout.className}
        contentStyle={activeContentLayout.style}
        actions={pages.length > 0 && (
          <>
                  {selectedCount > 0 && (
                    <Button
                      onClick={downloadSelected}
                      disabled={isProcessing}
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-md"
                    >
                      {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      <span className="hidden sm:inline text-sm">Baixar selecionadas</span>
                    </Button>
                  )}
                  <Button
                    onClick={downloadAll}
                    disabled={isProcessing}
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700 text-white gap-2 shadow-md"
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                    <span className="hidden sm:inline text-sm">Baixar Tudo</span>
                  </Button>
                  <span className="text-sm text-zinc-400">{pages.length} página(s) / {outputGroupCount} arquivo(s)</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={removeAllFiles}
                    className="text-slate-500 hover:text-red-600"
                  >
                    <X className="w-4 h-4" />
                  </Button>
          </>
        )}
      />

      <main className={cn(activeContentLayout.className, 'py-8')} style={activeContentLayout.style}>
        {!sourceFileName && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => {
              appendModeRef.current = false;
              fileInputRef.current?.click();
            }}
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
              <div className={cn('p-3 rounded-full transition-colors', isDragging ? 'bg-amber-500/20' : 'bg-zinc-800')}>
                <Upload className={cn('w-8 h-8 transition-colors', isDragging ? 'text-amber-300' : 'text-zinc-400')} />
              </div>
              <div>
                <p className="text-base font-medium text-zinc-200">{isDragging ? 'Solte o PDF aqui' : 'Arraste um PDF ou clique para escolher'}</p>
                <p className="text-sm text-zinc-500 mt-1">Selecione um arquivo PDF para separar as páginas</p>
              </div>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
            <Loader2 className="w-10 h-10 animate-spin mb-4 text-amber-500" />
            <p className="text-sm">Carregando páginas...</p>
          </div>
        )}

        {sourceFileName && pages.length > 0 && !isLoading && (
          <div>
            <p className="text-sm text-zinc-500 mb-4">Clique para selecionar páginas específicas.</p>
            <div className="grid grid-cols-[repeat(auto-fill,260px)] gap-x-3 gap-y-4 pb-3">
              {pages.map((page, index) => (
                <div key={page.id} className="relative w-[260px]">
                  <Card
                    onClick={() => toggleSelect(page.id)}
                    className={cn(
                      'w-[220px] bg-zinc-900/60 border-zinc-800 overflow-hidden hover:border-zinc-700 transition-all cursor-pointer',
                      page.selected ? 'ring-4 ring-blue-500' : ''
                    )}
                  >
                    <CardContent className="p-3 space-y-2.5">
                      <div className="relative">
                        <div
                          className={cn(
                            'h-64 rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden flex items-center justify-center transition-transform duration-300',
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
                              <span className="text-[10px]">Carregando...</span>
                            </div>
                          )}
                        </div>
                        {page.rotation !== 0 && (
                          <div className="absolute -bottom-1.5 -right-1.5 bg-amber-600 text-white text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-sm">
                            {rotationLabel(page.rotation)}
                          </div>
                        )}
                        <div className="absolute top-1.5 left-1.5 bg-zinc-800/90 text-zinc-300 text-[10px] font-bold px-1.5 py-0.5 rounded">
                          {page.pageNumber}
                        </div>
                        <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); void openPreview(page); }}
                            className="h-7 w-7 p-0 bg-zinc-950/80 text-zinc-300 hover:text-amber-300 hover:bg-zinc-900"
                            title="Visualizar página"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); removePage(page.id); }}
                            className="h-7 w-7 p-0 bg-zinc-950/80 text-zinc-300 hover:text-red-300 hover:bg-zinc-900"
                            title="Excluir página"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      <Input
                        value={page.name}
                        onChange={(e) => updateName(page.id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-7 text-xs bg-zinc-800 border-zinc-700 text-zinc-200 focus:border-amber-500 focus:ring-amber-500/20"
                        placeholder="nome_do_arquivo"
                      />

                      <div className="flex items-center justify-between">
                        <div className="flex items-center bg-zinc-800 rounded-md p-0.5 border border-zinc-700">
                          {[0, 90, 180, 270].map((deg) => (
                            <button
                              key={deg}
                              onClick={(e) => { e.stopPropagation(); setRotation(page.id, deg); }}
                              className={cn(
                                'px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors',
                                page.rotation === deg ? 'bg-zinc-950 text-amber-300 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
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

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); void downloadPage(page); }}
                        disabled={isProcessing}
                        className="w-full text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 border border-zinc-800 hover:border-emerald-500/30 h-8 text-xs gap-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Baixar
                      </Button>
                    </CardContent>
                  </Card>

                  {index < pages.length - 1 && (
                    <button
                      type="button"
                      onClick={() => toggleCut(index)}
                      className={cn(
                        'group absolute inset-y-0 right-0 flex items-center justify-center w-8 transition-colors'
                      )}
                      title={(cutsAfter[index] ?? true) ? 'Separar entre páginas' : 'Juntar páginas'}
                    >
                      <span
                        className={cn(
                          'h-[88%] transition-all duration-150 group-hover:w-[4px]',
                          (cutsAfter[index] ?? true) ? 'w-[2px] bg-blue-600/90' : 'w-[2px] bg-zinc-700/80 group-hover:bg-zinc-500'
                        )}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className={cn(
                          'absolute h-7 w-7 p-0 rounded-full border pointer-events-none transition-transform duration-150 group-hover:scale-110',
                          (cutsAfter[index] ?? true)
                            ? 'text-blue-200 border-blue-500/50 bg-blue-600/80'
                            : 'text-zinc-300 border-zinc-600 bg-zinc-800'
                        )}
                      >
                        <span>
                          {(cutsAfter[index] ?? true) ? <Scissors className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                        </span>
                      </Button>
                    </button>
                  )}
                </div>
              ))}

              <div className="w-[260px]">
                <button
                  type="button"
                  onClick={triggerAddPdf}
                  className="w-[220px] min-h-[420px] rounded-lg border border-dashed border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800/70 transition-colors flex flex-col items-center justify-center gap-2 text-zinc-300"
                >
                  <div className="w-8 h-8 rounded-full border border-zinc-500 flex items-center justify-center">
                    <Plus className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium">Adicionar PDF</span>
                </button>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}
      </main>

      {preview && (
        <div
          className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="relative max-h-[92vh] max-w-4xl w-full rounded-lg border border-zinc-800 bg-zinc-900 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-12 px-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <Eye className="w-4 h-4 text-amber-300" />
                Página {preview.page.pageNumber}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreview(null)}
                className="h-8 w-8 p-0 text-zinc-400 hover:text-red-400"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="max-h-[calc(92vh-3rem)] overflow-auto bg-zinc-950 p-4 flex justify-center">
              {preview.loading ? (
                <div className="h-96 flex flex-col items-center justify-center text-zinc-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-3 text-amber-500" />
                  <span className="text-sm">Carregando visualização...</span>
                </div>
              ) : (
                <img
                  src={preview.image}
                  alt={`Página ${preview.page.pageNumber}`}
                  className={cn(
                    'max-w-full h-auto bg-white rounded shadow-lg',
                    preview.page.rotation === 90 && 'rotate-90',
                    preview.page.rotation === 180 && 'rotate-180',
                    preview.page.rotation === 270 && '-rotate-90'
                  )}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
