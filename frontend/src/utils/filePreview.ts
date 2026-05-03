const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api/v1';

type PreviewPayload = {
  blob: Blob;
  contentType: string;
};

export const fetchPreviewBlob = async (mapId: number): Promise<PreviewPayload> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/proxy/preview/${mapId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `HTTP ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || 'application/pdf';
  const blob = await response.blob();
  return { blob, contentType };
};

export const openBlobInNewTab = (blob: Blob, title: string, contentType: string) => {
  const tab = window.open('', '_blank');
  if (!tab) return;

  const url = window.URL.createObjectURL(blob);
  tab.location.href = url;
  tab.document.title = title;
};
