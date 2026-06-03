import type React from 'react';

export const PDF_MIME = 'application/pdf';
export const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

export function isPdfFile(file: File) {
  return file.type === PDF_MIME || file.name.toLowerCase().endsWith('.pdf');
}

export function isEditorImageFile(file: File) {
  const lowerName = file.name.toLowerCase();
  return (
    IMAGE_MIME_TYPES.includes(file.type as (typeof IMAGE_MIME_TYPES)[number]) ||
    lowerName.endsWith('.png') ||
    lowerName.endsWith('.jpg') ||
    lowerName.endsWith('.jpeg') ||
    lowerName.endsWith('.webp')
  );
}

export function dragHasFiles(e: React.DragEvent) {
  return Array.from(e.dataTransfer.types).includes('Files');
}

export function dragLooksLikePdf(e: React.DragEvent) {
  const items = Array.from(e.dataTransfer.items ?? []);
  if (items.length === 0) return true;
  return items.some((item) => item.kind === 'file' && (!item.type || item.type === PDF_MIME));
}

export function dragLooksLikeEditorFile(e: React.DragEvent) {
  const items = Array.from(e.dataTransfer.items ?? []);
  if (items.length === 0) return true;
  return items.some(
    (item) =>
      item.kind === 'file' &&
      (!item.type ||
        item.type === PDF_MIME ||
        IMAGE_MIME_TYPES.includes(item.type as (typeof IMAGE_MIME_TYPES)[number]))
  );
}
