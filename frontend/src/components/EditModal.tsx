import React, { useState, useEffect, useRef } from 'react';
import { Modal } from './Modal';
import { Input } from './Input';
import { Button } from './Button';
import { History, Save } from 'lucide-react';

interface MapRecord {
  map_id: number;
  unique_id: string;
  layout_name: string;
  project_path: string;
  project_name: string;
  status: string;
  comment?: string;
  income_num?: string;
  outcome_num?: string;
  to_whom?: string;
}

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: MapRecord | null;
  onSave: (data: MapRecord) => void;
  onRecordChange: (record: MapRecord | null) => void;
}

export const EditModal: React.FC<EditModalProps> = ({ isOpen, onClose, record, onSave, onRecordChange }) => {
  const [formData, setFormData] = useState<Partial<MapRecord>>({});
  const [isSaving, setIsSaving] = useState(false);
  const pendingSaveRef = useRef(false);

  useEffect(() => {
    if (record) {
      setFormData({
        status: record.status || 'In Progress',
        comment: record.comment || '',
        income_num: record.income_num || '',
        outcome_num: record.outcome_num || '',
        to_whom: record.to_whom || '',
      });
    }
  }, [record]);

  // Watch for formData changes and update parent
  useEffect(() => {
    if (record && formData.status && formData.status !== record.status) {
      const updatedRecord = {
        ...record,
        status: formData.status,
        comment: formData.comment || '',
        income_num: formData.income_num || '',
        outcome_num: formData.outcome_num || '',
        to_whom: formData.to_whom || '',
      };
      onRecordChange(updatedRecord);
    }
  }, [formData.status, formData.to_whom]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!record) return;
    
    setIsSaving(true);
    
    // Build the updated record with current form data
    const updatedRecord: MapRecord = {
      ...record,
      status: formData.status || record.status,
      comment: formData.comment || '',
      income_num: formData.income_num || '',
      outcome_num: formData.outcome_num || '',
      to_whom: formData.to_whom || '',
    };
    
    console.log('EditModal submitting:', updatedRecord);
    
    // Pass data directly to onSave (not through state)
    onSave(updatedRecord);
    
    // Close modal
    onClose();
    setIsSaving(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Record: ${record?.unique_id}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Income Number"
            value={formData.income_num || ''}
            onChange={(e) => setFormData({ ...formData, income_num: e.target.value })}
          />
          <Input
            label="Outcome Number"
            value={formData.outcome_num || ''}
            onChange={(e) => setFormData({ ...formData, outcome_num: e.target.value })}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Status</label>
          <select
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.status || 'In Progress'}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          >
            <option value="Not Started">Not Started</option>
            <option value="In Progress">In Progress</option>
            <option value="Complete">Complete</option>
            <option value="On Hold">On Hold</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">To Whom</label>
          <select
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.to_whom || ''}
            onChange={(e) => {
              setFormData({ ...formData, to_whom: e.target.value });
              if (record) {
                const updatedRecord = {
                  ...record,
                  status: formData.status || record.status,
                  comment: formData.comment || '',
                  income_num: formData.income_num || '',
                  outcome_num: formData.outcome_num || '',
                  to_whom: e.target.value,
                };
                onRecordChange(updatedRecord);
              }
            }}
          >
            <option value="" hidden>-- Select --</option>
            <option value="Gov1">Gov1</option>
            <option value="Gov2">Gov2</option>
            <option value="Gov3">Gov3</option>
            <option value="Gov4">Gov4</option>
            <option value="Gov5">Gov5</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Comments</label>
          <textarea
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            value={formData.comment || ''}
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
