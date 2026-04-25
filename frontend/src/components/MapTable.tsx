import React from 'react';
import { Eye, Edit2, FileText } from 'lucide-react';
import { Button } from './Button';

interface MapRecord {
  map_id: number;
  unique_id: string;
  layout_name: string;
  project_code: string;
  client_name: string;
  status: string;
  created_at: string;
  analyst_id: number;
}

interface MapTableProps {
  data: MapRecord[];
  onView: (id: number) => void;
  onEdit: (record: MapRecord) => void;
  currentUserId: number;
  userRole: string;
}

export const MapTable: React.FC<MapTableProps> = ({ data, onView, onEdit, currentUserId, userRole }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Complete': return 'bg-green-100 text-green-800 border-green-200';
      case 'In Progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'On Hold': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-600">
          <tr>
            <th className="px-6 py-4">ID</th>
            <th className="px-6 py-4">Layout Name</th>
            <th className="px-6 py-4">Project / Client</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4">Date</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {data.map((row) => (
            <tr key={row.map_id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 font-mono font-medium text-blue-600">{row.unique_id}</td>
              <td className="px-6 py-4 font-medium text-gray-900">{row.layout_name}</td>
              <td className="px-6 py-4">
                <div className="text-gray-900">{row.project_code}</div>
                <div className="text-xs text-gray-500">{row.client_name}</div>
              </td>
              <td className="px-6 py-4">
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getStatusColor(row.status)}`}>
                  {row.status}
                </span>
              </td>
              <td className="px-6 py-4 text-gray-500">
                {new Date(row.created_at).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 text-right space-x-2">
                <Button variant="ghost" size="sm" onClick={() => onView(row.map_id)} title="View PDF">
                  <Eye className="h-4 w-4" />
                </Button>
                {(userRole === 'admin' || userRole === 'owner' || row.analyst_id === currentUserId) && (
                  <Button variant="ghost" size="sm" onClick={() => onEdit(row)} title="Edit Record">
                    <Edit2 className="h-4 w-4 text-gray-600" />
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
