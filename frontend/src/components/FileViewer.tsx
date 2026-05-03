import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Download, ExternalLink, FileText, Loader } from 'lucide-react';
import { Button } from './Button';
import { fetchPreviewBlob, openBlobInNewTab } from '../utils/filePreview';

interface FileViewerProps {
  isOpen: boolean;
  onClose: () => void;
  mapId: number | null;
  uniqueId: string | null;
}

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api/v1';

export const FileViewer: React.FC<FileViewerProps> = ({ isOpen, onClose, mapId, uniqueId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'pdf' | 'image'>('pdf');

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
      const { blob, contentType } = await fetchPreviewBlob(mapId);
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

  const handleOpenNewTab = async () => {
    if (!mapId) return;
    setLoading(true);
    try {
      const { blob, contentType } = await fetchPreviewBlob(mapId);
      const title = uniqueId ? `Preview: ${uniqueId}` : 'Preview';
      openBlobInNewTab(blob, title, contentType);
    } catch (e) {
      const errTab = window.open('', '_blank');
      if (errTab) {
        errTab.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Preview Error</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 24px; background: #111827; color: #f87171; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .error-box { text-align: center; }
    .error-box h2 { margin-bottom: 8px; font-size: 18px; }
    .error-box p { font-size: 14px; opacity: 0.8; }
  </style>
</head>
<body>
  <div class="error-box">
    <h2>Failed to load preview</h2>
    <p>${e instanceof Error ? e.message : 'Unknown error occurred'}</p>
  </div>
</body>
</html>`);
        errTab.document.close();
      }
    } finally {
      setLoading(false);
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
