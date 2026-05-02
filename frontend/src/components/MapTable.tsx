import React, { useState, useMemo } from 'react';
import { Eye, Download, Pen, History, ExternalLink } from 'lucide-react';

interface MapRecord {
  map_id: number;
  unique_id: string;
  layout_name: string;
  project_path: string;
  project_name: string;
  category?: string;
  income_num?: string;
  outcome_num?: string;
  to_whom?: string;
  status: string;
  comment?: string;
  created_at: string;
  analyst_id: number;
  file_path?: string;
}

interface MapTableProps {
  data: MapRecord[];
  onViewNewTab: (record: MapRecord) => void;
  onEdit: (record: MapRecord) => void;
  onDownload: (record: MapRecord) => void;
  onDetail: (record: MapRecord) => void;
  onAuditLog?: (record: MapRecord) => void;
  hasAuditLog?: (mapId: number) => boolean;
  currentUserId: number;
  userRole: string;
}

export const MapTable: React.FC<MapTableProps> = ({ 
  data, 
  onViewNewTab, 
  onEdit, 
  onDownload, 
  onDetail,
  onAuditLog,
  hasAuditLog,
  currentUserId, 
  userRole 
}) => {
  const [sortField, setSortField] = useState<'created_at' | 'unique_id' | 'layout_name' | 'status' | 'to_whom' | 'income_num'>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  type SortField = 'created_at' | 'unique_id' | 'layout_name' | 'status' | 'to_whom' | 'income_num';

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      let aVal: string | number = a[sortField] ?? '';
      let bVal: string | number = b[sortField] ?? '';
      
      if (sortField === 'created_at') {
        aVal = new Date(a.created_at).getTime();
        bVal = new Date(b.created_at).getTime();
      } else {
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
      }
      
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const getSortIndicator = (field: typeof sortField) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Complete': return 'bg-green-100 text-green-800 border border-green-200';
      case 'In Progress': return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'On Hold': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const canEdit = (analystId: number) => userRole === 'admin' || userRole === 'owner' || analystId === currentUserId;

  const th = "px-3 py-2.5 border border-gray-300 text-center text-xs font-semibold bg-gray-50 text-gray-600";
  const td = "px-3 py-2.5 border border-gray-300 text-center align-middle";

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-300 bg-white shadow-sm">
      <table className="w-full text-sm min-w-0 border-collapse">
        <thead>
          <tr>
            <th className={th + " cursor-pointer hover:text-blue-600 whitespace-nowrap"} onClick={() => handleSort('unique_id')}>ID{getSortIndicator('unique_id')}</th>
            <th className={th + " cursor-pointer hover:text-blue-600"} onClick={() => handleSort('layout_name')}>Layout{getSortIndicator('layout_name')}</th>
            <th className={th + " cursor-pointer hover:text-blue-600 whitespace-nowrap"} onClick={() => handleSort('income_num')}>رقم الوارد{getSortIndicator('income_num')}</th>
            <th className={th + " whitespace-nowrap"}>رقم الصادر</th>
            <th className={th + " cursor-pointer hover:text-blue-600 whitespace-nowrap"} onClick={() => handleSort('to_whom')}>جهه الولاية{getSortIndicator('to_whom')}</th>
            <th className={th + " cursor-pointer hover:text-blue-600 whitespace-nowrap"} onClick={() => handleSort('status')}>حالة الدراسة{getSortIndicator('status')}</th>
            <th className={th + " min-w-[120px]"}>ملاحظات</th>
            <th className={th + " cursor-pointer hover:text-blue-600 whitespace-nowrap"} onClick={() => handleSort('created_at')}>التاريخ{getSortIndicator('created_at')}</th>
            <th className={th + " whitespace-nowrap"}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row) => (
            <tr key={row.map_id} className="hover:bg-gray-50 transition-colors">
              <td className={td + " whitespace-nowrap"}>
                <span className="font-mono font-medium text-blue-600">{row.unique_id}</span>
              </td>
              <td className={td + " max-w-[200px]"}>
                <div className="text-center whitespace-nowrap overflow-hidden text-ellipsis" title={row.layout_name}>{row.layout_name}</div>
              </td>
              <td className={td + " text-gray-700 whitespace-nowrap"}>
                {row.income_num || '—'}
              </td>
              <td className={td + " text-gray-700 whitespace-nowrap"}>
                {row.outcome_num || '—'}
              </td>
              <td className={td + " text-gray-700 whitespace-nowrap"}>
                {row.to_whom || '—'}
              </td>
              <td className={td + " whitespace-nowrap"}>
                <div className="flex justify-center">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(row.status)}`}>
                    {row.status}
                  </span>
                </div>
              </td>
              <td className={td + " text-gray-500 min-w-[120px]"}>
                <div className="whitespace-normal break-words text-center">{row.comment || '—'}</div>
              </td>
              <td className={td + " text-gray-500 whitespace-nowrap"}>
                {new Date(row.created_at).toLocaleDateString()}
              </td>
              <td className={td + " whitespace-nowrap"}>
                <div className="flex items-center justify-center gap-1">
                  <button
                    onClick={() => onDetail(row)}
                    className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    title="More Details"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onViewNewTab(row)}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                    title="Preview"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDownload(row)}
                    className="p-1.5 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  {canEdit(row.analyst_id) && (
                    <button
                      onClick={() => onEdit(row)}
                      className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-full transition-colors"
                      title="Edit Record"
                    >
                      <Pen className="h-4 w-4" />
                    </button>
                  )}
                  {hasAuditLog && hasAuditLog(row.map_id) && (
                    <button
                      onClick={() => onAuditLog?.(row)}
                      className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-full transition-colors"
                      title="View Audit Log"
                    >
                      <History className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {data.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          <p className="text-lg">No maps found</p>
        </div>
      )}
    </div>
  );
};