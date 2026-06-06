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

import api from '../utils/api';
const API_URL = (import.meta.env.VITE_API_URL || '') + '/api/v1';

const b64ToBlob = (b64: string, contentType: string) => {
  const byteCharacters = atob(b64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: contentType });
};

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
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/proxy/preview/${mapId}`, {
        headers: { 
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
      }
      
      const payload = await response.json();
      const contentType = payload.media_type || 'application/pdf';
      const isImage = String(contentType).includes('image/');
      
      if (isImage) {
        // Use data URL for images — no blob cross-context issues
        const dataUrl = `data:${contentType};base64,${payload.data_base64}`;
        setFileUrl(dataUrl);
      } else {
        // Keep blob URL for PDFs (works in iframe with sidebar)
        const blob = b64ToBlob(payload.data_base64, contentType);
        const url = window.URL.createObjectURL(blob);
        setFileUrl(url);
      }
      setFileType(isImage ? 'image' : 'pdf');
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
      const response = await api.get(`/proxy/preview/${mapId}`);
      const payload = response.data;
      const contentType = payload.media_type || 'application/pdf';
      const isImage = String(contentType).includes('image/');

      let objectUrl: string;
      if (isImage) {
        objectUrl = `data:${contentType};base64,${payload.data_base64}`;
      } else {
        const blob = b64ToBlob(payload.data_base64, contentType);
        objectUrl = window.URL.createObjectURL(blob);
      }

      // Safe: navigate directly to the blob URL — no document.write, no XSS risk
      const win = window.open(objectUrl, '_blank', 'noopener,noreferrer');
      if (win && !isImage) {
        win.addEventListener('unload', () => window.URL.revokeObjectURL(objectUrl));
      }
    } catch (e) {
      console.error('Failed to open preview in new tab:', e);
    } finally {
      setLoading(false);
    }
  };

  // ---- old stub to mark replacement complete

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
