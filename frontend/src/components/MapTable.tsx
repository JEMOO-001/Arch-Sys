import React, { useState, useMemo } from 'react';
import { Eye, Download, Pen, History } from 'lucide-react';

interface MapRecord {
  map_id: number;
  unique_id: string;
  layout_name: string;
  project_path: string;
  project_name: string;
  status: string;
  created_at: string;
  analyst_id: number;
  file_path?: string;
}

interface MapTableProps {
  data: MapRecord[];
  onViewNewTab: (record: MapRecord) => void;
  onEdit: (record: MapRecord) => void;
  onDownload: (record: MapRecord) => void;
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
  onAuditLog,
  hasAuditLog,
  currentUserId, 
  userRole 
}) => {
  const [sortField, setSortField] = useState<'created_at' | 'unique_id' | 'layout_name' | 'project_name' | 'status'>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  type SortField = 'created_at' | 'unique_id' | 'layout_name' | 'project_name' | 'status';

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      let aVal: string | number = a[sortField];
      let bVal: string | number = b[sortField];
      
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
      case 'Complete': return 'bg-green-100 text-green-800 border-green-200';
      case 'In Progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'On Hold': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const canEdit = (analystId: number) => userRole === 'admin' || userRole === 'owner' || analystId === currentUserId;

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm min-w-0">
        <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-600">
          <tr>
            <th className="px-4 py-3 md:px-6 md:py-4 whitespace-nowrap cursor-pointer hover:text-blue-600" onClick={() => handleSort('unique_id')}>ID{getSortIndicator('unique_id')}</th>
            <th className="px-4 py-3 md:px-6 md:py-4 whitespace-nowrap cursor-pointer hover:text-blue-600" onClick={() => handleSort('layout_name')}>Layout{getSortIndicator('layout_name')}</th>
            <th className="px-4 py-3 md:px-6 md:py-4 whitespace-nowrap cursor-pointer hover:text-blue-600" onClick={() => handleSort('project_name')}>Project{getSortIndicator('project_name')}</th>
            <th className="px-4 py-3 md:px-6 md:py-4 whitespace-nowrap cursor-pointer hover:text-blue-600" onClick={() => handleSort('status')}>Status{getSortIndicator('status')}</th>
            <th className="px-4 py-3 md:px-6 md:py-4 whitespace-nowrap cursor-pointer hover:text-blue-600" onClick={() => handleSort('created_at')}>Date{getSortIndicator('created_at')}</th>
            <th className="px-4 py-3 md:px-6 md:py-4 text-right whitespace-nowrap">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {sortedData.map((row) => (
            <tr key={row.map_id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 md:px-6 md:py-4">
                <span className="font-mono font-medium text-blue-600 text-sm md:text-base">{row.unique_id}</span>
              </td>
              <td className="px-4 py-3 md:px-6 md:py-4">
                <span className="font-medium text-gray-900 text-sm md:text-base">{row.layout_name}</span>
              </td>
              <td className="px-4 py-3 md:px-6 md:py-4">
                <div className="text-gray-900 text-sm font-medium">{row.project_name}</div>
                <div className="text-xs text-gray-500 truncate max-w-xs" title={row.project_path}>{row.project_path}</div>
              </td>
              <td className="px-4 py-3 md:px-6 md:py-4">
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getStatusColor(row.status)}`}>
                  {row.status}
                </span>
              </td>
              <td className="px-4 py-3 md:px-6 md:py-4 text-gray-500 text-sm">
                {new Date(row.created_at).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 md:px-6 md:py-4 text-right">
                <div className="flex items-center justify-end gap-1">
                  {/* View - Opens in new tab */}
                  <button
                    onClick={() => onViewNewTab(row)}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                    title="Open in New Tab"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  
                  {/* Download */}
                  <button
                    onClick={() => onDownload(row)}
                    className="p-1.5 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                    title="Download PDF"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  
                  {/* Edit - Only if has permission */}
                  {canEdit(row.analyst_id) && (
                    <button
                      onClick={() => onEdit(row)}
                      className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-full transition-colors"
                      title="Edit Record"
                    >
                      <Pen className="h-4 w-4" />
                    </button>
                  )}
                  
                  {/* Audit Log - Only if has audit log */}
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