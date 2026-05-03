import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Download, ExternalLink, FileText, Loader } from 'lucide-react';
import { Button } from './Button';

interface FileViewerProps {
  isOpen: boolean;
  onClose: () => void;
  mapId: number | null;
  uniqueId: string | null;
  filePath?: string | null;
}

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api/v1';

export const FileViewer: React.FC<FileViewerProps> = ({ isOpen, onClose, mapId, uniqueId, filePath }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'pdf' | 'image'>('pdf');

  const isPdf = filePath?.toLowerCase().endsWith('.pdf') || false;
  const isImage = filePath?.toLowerCase().match(/\.(jpeg|jpg|png)$/) || false;

  useEffect(() => {
    if (isOpen && mapId) {
      loadFile();
    } else if (!isOpen) {
      if (fileUrl) {
        window.URL.revokeObjectURL(fileUrl);
      }
      setFileUrl(null);
      setError(null);
      setFileType('pdf');
    }
  }, [isOpen, mapId]);

  const loadFile = async () => {
    if (!mapId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/proxy/preview/${mapId}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
      }
      
      const contentType = response.headers.get('content-type') || 'application/pdf';
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      setFileUrl(url);
      setFileType(String(contentType).includes('image/') ? 'image' : 'pdf');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!fileUrl) return;
    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = `${uniqueId}.${fileType === 'image' ? 'jpeg' : 'pdf'}`;
    a.click();
  };

  const handleOpenNewTab = () => {
    if (!mapId) return;
    
    const previewUrl = `${API_URL}/proxy/preview/${mapId}`;
    
    if (isPdf) {
      // Open PDF directly in new tab - browser built-in viewer
      window.open(previewUrl, '_blank');
    } else {
      // For images: open blob in new tab
      if (fileUrl) {
        const tab = window.open('', '_blank');
        if (tab) {
          tab.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview: ${uniqueId || 'Image'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #111827; display: flex; align-items: center; justify-content: center; }
    img { max-width: 95vw; max-height: 95vh; object-fit: contain; }
    .error { color: #f87171; padding: 24px; text-align: center; }
  </style>
</head>
<body>
  <img src="${fileUrl}" alt="preview" onerror="document.body.innerHTML='<div class=\\'error\\'>Failed to load image</div>'" />
</body>
</html>`);
          tab.document.close();
        }
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Viewing: ${uniqueId}`} size="lg">
      <div className="flex flex-col gap-4">
        <div className="aspect-[4/3] w-full overflow-hidden rounded-lg border bg-gray-100">
          {loading && (
            <div className="flex h-full items-center justify-center">
              <Loader className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          )}
          {error && (
            <div className="flex h-full flex-col items-center justify-center text-red-500">
              <FileText className="h-12 w-12 mb-2" />
              <p className="mb-4">Failed to load: {error}</p>
              <Button variant="secondary" onClick={loadFile}>
                Retry
              </Button>
            </div>
          )}
          {fileUrl && !loading && !error && fileType === 'pdf' && (
            <iframe
              src={fileUrl}
              className="h-full w-full"
              title="Map Preview"
            />
          )}
          {fileUrl && !loading && !error && fileType === 'image' && (
            <div className="flex h-full w-full items-center justify-center bg-black/5 p-2">
              <img
                src={fileUrl}
                alt={uniqueId || 'Map Preview'}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          )}
          {!mapId && !loading && !error && (
            <div className="flex h-full items-center justify-center text-gray-400">
              No file selected
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={handleOpenNewTab}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Open in New Tab
          </Button>
          <Button onClick={handleDownload} disabled={!fileUrl}>
            <Download className="mr-2 h-4 w-4" />
            Download File
          </Button>
        </div>
      </div>
    </Modal>
  );
};
