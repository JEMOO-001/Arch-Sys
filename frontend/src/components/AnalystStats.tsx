import React from 'react';

interface AnalystStat {
  analyst_id: number;
  full_name: string;
  total_count: number;
  completed_count: number;
  last_archive: string;
}

export const AnalystStats: React.FC<{ stats: AnalystStat[] }> = ({ stats }) => {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-6 py-4">
        <h3 className="text-lg font-semibold text-gray-900">Analyst Performance</h3>
      </div>
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-600">
          <tr>
            <th className="px-6 py-3">Analyst Name</th>
            <th className="px-6 py-3">Total Output</th>
            <th className="px-6 py-3">Completion Rate</th>
            <th className="px-6 py-3">Last Activity</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {stats.map((row) => (
            <tr key={row.analyst_id}>
              <td className="px-6 py-4 font-medium text-gray-900">{row.full_name}</td>
              <td className="px-6 py-4">{row.total_count} layouts</td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 rounded-full bg-gray-100">
                    <div 
                      className="h-2 rounded-full bg-blue-600" 
                      style={{ width: `${(row.completed_count / row.total_count) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">
                    {Math.round((row.completed_count / row.total_count) * 100)}%
                  </span>
                </div>
              </td>
              <td className="px-6 py-4 text-gray-500">
                {new Date(row.last_archive).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
