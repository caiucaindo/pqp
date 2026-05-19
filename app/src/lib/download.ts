function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

export async function downloadPdf(bytes: Uint8Array, filename: string) {
  const webviewApi = (window as any).pywebview?.api;
  const payload = bytesToBase64(bytes);

  if (webviewApi?.savePdf) {
    try {
      const saved = await webviewApi.savePdf(filename, payload);
      if (saved) return;
      return;
    } catch (error) {
      console.error(error);
    }
  }

  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const blob = new Blob([arrayBuffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}