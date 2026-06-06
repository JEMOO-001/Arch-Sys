import React, { useState, useEffect } from 'react';
import { Clock, X } from 'lucide-react';
import { Modal } from './Modal';
import api from '../utils/api';

interface MapRecord {
  map_id: number;
  unique_id: string;
}

interface AuditEntry {
  id: number;
  action: string;
  changed_by: string;
  changed_at: string;
}

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: MapRecord | null;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({ isOpen, onClose, record }) => {
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    if (isOpen && record) {
      setIsLoading(true);
      api.get(`/maps/${record.map_id}/audit`)
        .then(res => {
          setAuditLog(res.data || []);
        })
        .catch(err => {
          console.error('Failed to fetch audit log:', err);
          setAuditLog([]);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, record]);
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Audit Log: ${record?.unique_id || ''}`}>
      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <p className="text-gray-500">Loading...</p>
        ) : auditLog.length === 0 ? (
          <p className="text-gray-500">No changes recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {auditLog.map(entry => (
              <div key={entry.id} className="border-b pb-3 last:border-b-0">
                <p className="text-sm text-gray-800 whitespace-pre-line">{entry.action}</p>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-xs text-gray-500 font-medium">
                    By: {entry.changed_by}
                  </p>
                  <p className="text-xs text-gray-400">
                    {entry.changed_at ? new Date(entry.changed_at).toLocaleString() : 'Unknown date'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};