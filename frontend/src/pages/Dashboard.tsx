import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Database, Settings, LogOut } from 'lucide-react';
import { MapTable } from '../components/MapTable';
import { SummaryCards } from '../components/SummaryCards';
import { AnalystStats } from '../components/AnalystStats';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { FileViewer } from '../components/FileViewer';
import { EditModal } from '../components/EditModal';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const API_URL = 'http://localhost:8000';

interface Stats {
  total: number;
  inProgress: number;
  complete: number;
  onHold: number;
}

interface Analyst {
  user_id: number;
  full_name: string;
  total_count: number;
  completed_count: number;
  last_archive: string;
}

interface MapRecord {
  map_id: number;
  unique_id: string;
  layout_name: string;
  project_code: string;
  client_name: string;
  status: string;
  created_at: string;
  analyst_id: number;
  file_path?: string;
  comment?: string;
  income_num?: string;
  outcome_num?: string;
}

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [stats, setStats] = useState<Stats>({ total: 0, inProgress: 0, complete: 0, onHold: 0 });
  const [analysts, setAnalysts] = useState<Analyst[]>([]);
  const [maps, setMaps] = useState<MapRecord[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerMapId, setViewerMapId] = useState<number | null>(null);
  const [viewerUniqueId, setViewerUniqueId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<MapRecord | null>(null);
  const [editRecordForModal, setEditRecordForModal] = useState<MapRecord | null>(null);

  const token = localStorage.getItem('token');
  const isAdmin = user?.role === 'admin' || user?.role === 'owner';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        
        const [statsRes, mapsRes] = await Promise.all([
          axios.get(`${API_URL}/stats/summary`, { headers }),
          axios.get(`${API_URL}/maps/`, { headers })
        ]);
        
        setStats(statsRes.data);
        setMaps(mapsRes.data);
        
        if (isAdmin) {
          const analystsRes = await axios.get(`${API_URL}/stats/analysts`, { headers });
          setAnalysts(analystsRes.data);
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [token, isAdmin]);

  const handleSearch = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/maps/`, { 
        headers,
        params: { search: search || undefined }
      });
      setMaps(res.data);
    } catch (err) {
      console.error('Search failed:', err);
    }
  };

  const handleView = (mapId: number) => {
    const record = maps.find(m => m.map_id === mapId);
    setViewerMapId(mapId);
    setViewerUniqueId(record?.unique_id || null);
    setViewerOpen(true);
  };

  const handleEdit = (record: MapRecord) => {
    setEditRecord(record);
    setEditRecordForModal(record);
    setEditOpen(true);
  };

  const handleRecordChange = (updated: MapRecord | null) => {
    console.log('Record changed:', updated);
    setEditRecordForModal(updated);
  };

  const handleSaveEdit = async () => {
    if (!editRecordForModal) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      console.log('Saving edit for map_id:', editRecordForModal.map_id);
      console.log('Sending:', {
        status: editRecordForModal.status,
        comment: editRecordForModal.comment,
        income_num: editRecordForModal.income_num,
        outcome_num: editRecordForModal.outcome_num,
      });
      
      const res = await axios.patch(`${API_URL}/maps/${editRecordForModal.map_id}`, {
        status: editRecordForModal.status,
        comment: editRecordForModal.comment,
        income_num: editRecordForModal.income_num,
        outcome_num: editRecordForModal.outcome_num,
      }, { headers });
      
      console.log('API Response:', res.data);
      setEditOpen(false);
      
      // Force refresh all data
      setSearch('');
      const mapsRes = await axios.get(`${API_URL}/maps/`, { headers });
      console.log('Fetched maps after save:', mapsRes.data);
      setMaps(mapsRes.data);
      
      // Also refresh stats
      const statsRes = await axios.get(`${API_URL}/stats/summary`, { headers });
      setStats(statsRes.data);
    } catch (err: any) {
      console.error('Save failed:', err?.response?.data || err.message);
      alert('Save failed: ' + (err?.response?.data?.detail || err.message));
    }
  };

  const refreshData = () => {
    handleSearch();
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 260 : 80 }}
        className="flex flex-col border-r border-gray-200 bg-white shadow-sm"
      >
        <div className="flex h-16 items-center border-b border-gray-200 px-6">
          <Database className="h-8 w-8 text-blue-600" />
          {isSidebarOpen && <span className="ml-3 font-bold text-gray-900 tracking-tight text-xl">Sentinel</span>}
        </div>
        
        <nav className="flex-1 space-y-2 p-4">
          <NavItem icon={Database} label="Dashboard" active isOpen={isSidebarOpen} />
          <NavItem icon={Settings} label="Settings" isOpen={isSidebarOpen} />
        </nav>

        <div className="border-t border-gray-200 p-4">
          <button 
            onClick={logout}
            className="flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {isSidebarOpen && <span className="ml-3 truncate">Logout</span>}
          </button>
        </div>
      </motion.aside>

      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Monitoring Overview</h1>
              <p className="mt-1 text-gray-500">Welcome back, {user?.username}</p>
            </div>
            <Button onClick={() => setIsSidebarOpen(!isSidebarOpen)} variant="secondary">
              Toggle Sidebar
            </Button>
          </div>

          <SummaryCards stats={stats} />

          <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
               <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">Recent Archives</h2>
                  <div className="flex gap-4">
                     <Input 
                       placeholder="Search..." 
                       className="w-64"
                       value={search}
                       onChange={(e) => setSearch(e.target.value)}
                       onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                     />
                     <Button variant="outline" onClick={handleSearch}>
                       Search
                     </Button>
                  </div>
               </div>
               <MapTable 
                 data={maps} 
                 currentUserId={user?.user_id || 0} 
                 userRole={user?.role || 'analyst'} 
                 onView={handleView}
                 onEdit={handleEdit}
               />
            </div>
            
            {isAdmin && (
              <div>
                <AnalystStats stats={analysts} />
              </div>
            )}
          </div>
        </div>
      </main>

      <FileViewer 
        isOpen={viewerOpen} 
        onClose={() => setViewerOpen(false)} 
        mapId={viewerMapId} 
        uniqueId={viewerUniqueId} 
      />

      <EditModal 
        isOpen={editOpen} 
        onClose={() => setEditOpen(false)} 
        record={editRecordForModal}
        onSave={handleSaveEdit}
        onRecordChange={handleRecordChange}
      />
    </div>
  );
};

const NavItem = ({ icon: Icon, label, active = false, isOpen = true }: { icon: React.ElementType, label: string, active?: boolean, isOpen?: boolean }) => (
  <button className={`flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
  }`}>
    <Icon className="h-5 w-5 shrink-0" />
    {isOpen && <span className="ml-3 truncate">{label}</span>}
  </button>
);