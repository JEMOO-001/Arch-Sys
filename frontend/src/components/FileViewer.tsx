import React from 'react';
import { Modal } from './Modal';
import { Download, ExternalLink } from 'lucide-react';
import { Button } from './Button';

interface FileViewerProps {
  isOpen: boolean;
  onClose: () => void;
  mapId: number | null;
  uniqueId: string | null;
}

export const FileViewer: React.FC<FileViewerProps> = ({ isOpen, onClose, mapId, uniqueId }) => {
  const fileUrl = mapId ? `http://localhost:8000/proxy/file/${mapId}` : '';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Viewing: ${uniqueId}`}>
      <div className="flex flex-col gap-4">
        <div className="aspect-[4/3] w-full overflow-hidden rounded-lg border bg-gray-100">
          {mapId ? (
            <iframe
              src={`${fileUrl}#toolbar=0`}
              className="h-full w-full"
              title="Map Preview"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-400">
              No file selected
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => window.open(fileUrl, '_blank')}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Open in New Tab
          </Button>
          <a href={fileUrl} download={`${uniqueId}.pdf`}>
            <Button>
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          </a>
        </div>
      </div>
    </Modal>
  );
};
