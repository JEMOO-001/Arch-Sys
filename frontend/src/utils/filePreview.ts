const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api/v1';

type PreviewPayload = {
  blob: Blob;
  contentType: string;
};

export const fetchPreviewBlob = async (mapId: number): Promise<PreviewPayload> => {
  const response = await fetch(`${API_URL}/proxy/preview/${mapId}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `HTTP ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || 'application/pdf';
  const blob = await response.blob();
  return { blob, contentType };
};

export const openInNewTab = (mapId: number) => {
  window.open(`${API_URL}/proxy/preview/${mapId}`, '_blank');
};
