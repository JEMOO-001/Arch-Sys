import React from 'react';
import { FileText, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

interface SummaryStats {
  total: number;
  inProgress: number;
  complete: number;
  onHold: number;
}

export const SummaryCards: React.FC<{ stats: SummaryStats }> = ({ stats }) => {
  const cards = [
    { label: 'Total Archives', value: stats.total, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'In Progress', value: stats.inProgress, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Completed', value: stats.complete, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'On Hold', value: stats.onHold, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="flex items-center rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className={`mr-4 rounded-lg ${card.bg} p-3`}>
            <card.icon className={`h-6 w-6 ${card.color}`} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">{card.label}</p>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
