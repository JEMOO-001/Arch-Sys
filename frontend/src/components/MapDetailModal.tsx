import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Eye, Download, Pen, History, ArrowLeft, FileText, Calendar, User, Folder, MapPin, Hash, Tag, MessageSquare, CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface MapRecord {
  map_id: number;
  unique_id: string;
  layout_name: string;
  project_path: string;
  project_name: string;
  category?: string;
  status: string;
  income_num?: string;
  outcome_num?: string;
  to_whom?: string;
  comment?: string;
  file_path?: string;
  created_at: string;
  updated_at?: string;
  analyst_id: number;
}

interface MapDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: MapRecord | null;
  onViewNewTab: (record: MapRecord) => void;
  onDownload: (record: MapRecord) => void;
  onEdit: (record: MapRecord) => void;
  onAuditLog?: (record: MapRecord) => void;
  hasAuditLog?: (mapId: number) => boolean;
  currentUserId: number;
  userRole: string;
}

export const MapDetailModal: React.FC<MapDetailModalProps> = ({
  isOpen,
  onClose,
  record,
  onViewNewTab,
  onDownload,
  onEdit,
  onAuditLog,
  hasAuditLog,
  currentUserId,
  userRole,
}) => {
  if (!record) return null;

  const canEdit = userRole === 'admin' || userRole === 'owner' || record.analyst_id === currentUserId;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Complete': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'In Progress': return <Clock className="h-5 w-5 text-blue-600" />;
      case 'On Hold': return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      default: return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Complete': return 'bg-green-50 text-green-800 border-green-200';
      case 'In Progress': return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'On Hold': return 'bg-yellow-50 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-50 text-gray-800 border-gray-200';
    }
  };

  const DetailRow = ({ icon, label, value, isWide = false }: { icon: React.ReactNode; label: string; value: React.ReactNode; isWide?: boolean }) => (
    <div className={`flex items-start gap-3 p-3 rounded-lg bg-gray-50 ${isWide ? 'col-span-2' : ''}`}>
      <div className="mt-0.5 text-gray-400 shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <div className="text-sm font-medium text-gray-900 break-words">{value || '—'}</div>
      </div>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={''} size="lg">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={onClose} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Record Details</h2>
              <span className="font-mono text-blue-600 font-medium">{record.unique_id}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onViewNewTab(record)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Preview"
            >
              <Eye className="h-5 w-5" />
            </button>
            <button
              onClick={() => onDownload(record)}
              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              title="Download"
            >
              <Download className="h-5 w-5" />
            </button>
            {canEdit && (
              <button
                onClick={() => { onClose(); onEdit(record); }}
                className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                title="Edit"
              >
                <Pen className="h-5 w-5" />
              </button>
            )}
            {hasAuditLog && hasAuditLog(record.map_id) && (
              <button
                onClick={() => { onClose(); onAuditLog?.(record); }}
                className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                title="Audit Log"
              >
                <History className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3">
          <DetailRow
            icon={<Hash className="h-4 w-4" />}
            label="ID"
            value={record.unique_id}
          />
          <DetailRow
            icon={<MapPin className="h-4 w-4" />}
            label="Layout"
            value={record.layout_name}
          />
          <DetailRow
            icon={<Folder className="h-4 w-4" />}
            label="Project Name"
            value={record.project_name}
          />
          <DetailRow
            icon={<FileText className="h-4 w-4" />}
            label="Project Path"
            value={record.project_path}
          />
          <DetailRow
            icon={<Tag className="h-4 w-4" />}
            label="Category"
            value={record.category}
          />
          <DetailRow
            icon={<div className="text-xs font-bold">ر.و</div>}
            label="رقم الوارد"
            value={record.income_num}
          />
          <DetailRow
            icon={<div className="text-xs font-bold">ر.ص</div>}
            label="رقم الصادر"
            value={record.outcome_num}
          />
          <DetailRow
            icon={<User className="h-4 w-4" />}
            label="جهه الولاية"
            value={record.to_whom}
          />
          <DetailRow
            icon={getStatusIcon(record.status)}
            label="حالة الدراسة"
            value={
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium border ${getStatusColor(record.status)}`}>
                {record.status}
              </span>
            }
          />
          <DetailRow
            icon={<Calendar className="h-4 w-4" />}
            label="التاريخ"
            value={new Date(record.created_at).toLocaleString()}
          />
          <div className="col-span-2">
            <DetailRow
              icon={<MessageSquare className="h-4 w-4" />}
              label="ملاحظات"
              value={record.comment}
              isWide
            />
          </div>
          <div className="col-span-2">
            <DetailRow
              icon={<FileText className="h-4 w-4" />}
              label="File Path"
              value={record.file_path}
              isWide
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};