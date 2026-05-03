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

export const openBlobInNewTab = (blob: Blob, title: string, contentType: string) => {
  const tab = window.open('', '_blank');
  if (!tab) return;

  const url = window.URL.createObjectURL(blob);
  
  // Write complete HTML to avoid navigation away from blob URL
  const isImage = String(contentType).includes('image/');
  const isPdf = String(contentType).includes('pdf');
  tab.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
    body { background: #111827; display: flex; align-items: center; justify-content: center; }
    img { max-width: 95vw; max-height: 95vh; object-fit: contain; }
    iframe { width: 100vw; height: 100vh; border: 0; }
    .error { color: #f87171; padding: 24px; text-align: center; }
  </style>
</head>
<body>
  ${isImage
    ? `<img src="${url}" alt="preview" onerror="document.body.innerHTML='<div class=\\'error\\'>Failed to load image</div>'" />`
    : `<iframe src="${url}" onerror="document.body.innerHTML='<div class=\\'error\\'>Failed to load PDF</div>'"></iframe>`
  }
  <script>
    (function() {
      var blobUrl = '${url}';
      window.addEventListener('beforeunload', function() {
        if (blobUrl) { URL.revokeObjectURL(blobUrl); blobUrl = null; }
      });
    })();
  </script>
</body>
</html>`);
  tab.document.close();
};
