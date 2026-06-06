// frontend/src/utils/filePreview.ts
import api from './api';  // reuse shared axios instance — no hardcoded IP, token in header

type PreviewPayload = {
  blob: Blob;
  contentType: string;
};

export const fetchPreviewBlob = async (mapId: number): Promise<PreviewPayload> => {
  // Authorization header is injected automatically by api.ts interceptor
  const response = await api.get(`/proxy/raw/${mapId}`, {
    responseType: 'blob',
  });
  const contentType = String(response.headers['content-type'] || 'application/pdf');
  return { blob: response.data as Blob, contentType };
};

/**
 * Opens a file in a new tab using a temporary object URL.
 * The JWT token is NEVER placed in the URL — it stays in the request header only.
 */
export const openFilePreview = async (mapId: number): Promise<void> => {
  try {
    const { blob } = await fetchPreviewBlob(mapId);
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (win) {
      win.addEventListener('unload', () => URL.revokeObjectURL(url));
    }
  } catch (err) {
    console.error('Failed to open file preview:', err);
    throw err;
  }
};
