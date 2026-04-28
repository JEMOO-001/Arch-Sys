import React from 'react';

interface AnalystStat {
  analyst_id?: number;
  user_id?: number;
  full_name: string;
  total_count: number;
  completed_count: number;
  last_archive: string;
}

export const AnalystStats: React.FC<{ stats: AnalystStat[] }> = ({ stats }) => {
  const getId = (row: AnalystStat) => row.analyst_id ?? row.user_id ?? 0;
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-gray-200 px-4 md:px-6 py-4">
        <h3 className="text-lg font-semibold text-gray-900">All Users Performance</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm min-w-0">
          <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-600">
            <tr>
              <th className="px-4 md:px-6 py-3 whitespace-nowrap">Analyst</th>
              <th className="px-4 md:px-6 py-3 whitespace-nowrap">Total</th>
              <th className="px-4 md:px-6 py-3 whitespace-nowrap">Done</th>
              <th className="px-4 md:px-6 py-3 whitespace-nowrap">Rate</th>
              <th className="px-4 md:px-6 py-3 whitespace-nowrap">Last Activity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {stats.map((row) => (
              <tr key={getId(row)} className="hover:bg-gray-50">
                <td className="px-4 md:px-6 py-4 font-medium text-gray-900 truncate max-w-[150px]">{row.full_name}</td>
                <td className="px-4 md:px-6 py-4 text-gray-600">{row.total_count}</td>
                <td className="px-4 md:px-6 py-4 text-gray-600">{row.completed_count}</td>
                <td className="px-4 md:px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-16 md:w-24 rounded-full bg-gray-100">
                      <div 
                        className="h-2 rounded-full bg-blue-600" 
                        style={{ width: `${row.total_count > 0 ? (row.completed_count / row.total_count) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {row.total_count > 0 ? Math.round((row.completed_count / row.total_count) * 100) : 0}%
                    </span>
                  </div>
                </td>
                <td className="px-4 md:px-6 py-4 text-gray-500 text-xs whitespace-nowrap">
                  {row.last_archive ? new Date(row.last_archive).toLocaleDateString() : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
