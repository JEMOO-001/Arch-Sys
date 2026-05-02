import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Download, ExternalLink, FileText, Loader } from 'lucide-react';
import { Button } from './Button';

interface FileViewerProps {
  isOpen: boolean;
  onClose: () => void;
  mapId: number | null;
  uniqueId: string | null;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const FileViewer: React.FC<FileViewerProps> = ({ isOpen, onClose, mapId, uniqueId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && mapId) {
      loadFile();
    } else if (!isOpen) {
      setFileUrl(null);
      setError(null);
    }
  }, [isOpen, mapId]);

  const loadFile = async () => {
    if (!mapId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/proxy/file/${mapId}`, {
        headers: { 
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
      }
      
      const contentType = response.headers.get('content-type') || 'application/pdf';
      const blob = await response.blob();
      
      // Create object URL with proper type
      const url = window.URL.createObjectURL(blob);
      setFileUrl(url);
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
    a.download = `${uniqueId}.pdf`;
    a.click();
  };

  const handleOpenNewTab = () => {
    if (!mapId) return;
    const token = localStorage.getItem('token');
    window.open(`${API_URL}/proxy/file/${mapId}?token=${token}`, '_blank');
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
              <p>Failed to load: {error}</p>
            </div>
          )}
          {fileUrl && !loading && !error && (
            <iframe
              src={fileUrl}
              className="h-full w-full"
              title="Map Preview"
            />
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
            Download PDF
          </Button>
        </div>
      </div>
    </Modal>
  );
};