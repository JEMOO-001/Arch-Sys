import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Input } from './Input';
import { Button } from './Button';
import { History, Save } from 'lucide-react';

interface MapRecord {
  map_id: number;
  unique_id: string;
  layout_name: string;
  project_code: string;
  client_name: string;
  status: string;
  comment?: string;
  income_num?: string;
  outcome_num?: string;
}

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: MapRecord | null;
  onSave: (id: number, data: any) => Promise<void>;
}

export const EditModal: React.FC<EditModalProps> = ({ isOpen, onClose, record, onSave }) => {
  const [formData, setFormData] = useState<Partial<MapRecord>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (record) {
      setFormData({
        status: record.status,
        comment: record.comment || '',
        income_num: record.income_num || '',
        outcome_num: record.outcome_num || '',
      });
    }
  }, [record]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!record) return;
    
    setIsSaving(true);
    try {
      await onSave(record.map_id, formData);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Record: ${record?.unique_id}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Income Number"
            value={formData.income_num}
            onChange={(e) => setFormData({ ...formData, income_num: e.target.value })}
          />
          <Input
            label="Outcome Number"
            value={formData.outcome_num}
            onChange={(e) => setFormData({ ...formData, outcome_num: e.target.value })}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Status</label>
          <select
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          >
            <option value="Not Started">Not Started</option>
            <option value="In Progress">In Progress</option>
            <option value="Complete">Complete</option>
            <option value="On Hold">On Hold</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Comments</label>
          <textarea
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            value={formData.comment}
            onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
          />
        </div>

        <div className="mt-6 flex items-center justify-between border-t pt-4">
          <Button variant="ghost" type="button" className="flex items-center gap-2 text-gray-500">
            <History className="h-4 w-4" />
            View Audit Log
          </Button>
          <div className="flex gap-3">
            <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" isLoading={isSaving} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
